import { PrismaClient } from "@prisma/client";
import { Queue, Worker } from "bullmq";
import net from "node:net";
import tls from "node:tls";

type ImportTarget = "customers" | "suppliers" | "items" | "masters";
type MasterKind = "customer-categories" | "supplier-categories" | "item-categories" | "units" | "tax-codes" | "currencies" | "payment-terms";
type ImportPayload = {
  target: ImportTarget;
  masterKind?: MasterKind;
  rows: Array<{
    rowNumber: number;
    values: Record<string, string | number | boolean | undefined>;
  }>;
};
type EmailAttachmentPayload = {
  filename: string;
  contentType: string;
  base64Content: string;
};
type ReportEmailPayload = {
  deliveryLogId: string;
  companyId: string;
  requestedById?: string;
  recipients: string[];
  subject: string;
  text: string;
  attachment: EmailAttachmentPayload;
};

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const parsedRedisUrl = new URL(redisUrl);
const connection = {
  host: parsedRedisUrl.hostname,
  port: Number(parsedRedisUrl.port || 6379),
  password: parsedRedisUrl.password || undefined
};

export const erpQueue = new Queue("erp-background-jobs", { connection });

const worker = new Worker(
  "erp-background-jobs",
  async (job) => {
    if (job.name === "backup-health-check") {
      return {
        checkedAt: new Date().toISOString(),
        status: "pending-production-restore-test"
      };
    }

    if (job.name === "master-data-import") {
      return processMasterDataImport(String(job.data.importJobId), async (progress) => job.updateProgress(progress));
    }

    if (job.name === "report-email") {
      return processReportEmail(job.data as ReportEmailPayload);
    }

    return {
      ignored: true,
      name: job.name
    };
  },
  { connection }
);

async function processMasterDataImport(importJobId: string, updateProgress: (progress: number) => Promise<void>) {
  const importJob = await prisma.importJob.findUnique({ where: { id: importJobId } });
  if (!importJob) throw new Error(`Import job ${importJobId} was not found`);

  const payload = JSON.parse(importJob.payloadJson) as ImportPayload;
  let importedRows = 0;
  let failedRows = 0;
  const errors: Array<{ rowNumber: number; code?: string; message: string }> = [];

  await prisma.importJob.update({
    where: { id: importJob.id },
    data: {
      status: "PROCESSING",
      startedAt: new Date()
    }
  });

  for (const [index, row] of payload.rows.entries()) {
    try {
      await createImportedRow(importJob.companyId, payload.target, payload.masterKind, row.values);
      importedRows += 1;
    } catch (error) {
      failedRows += 1;
      errors.push({
        rowNumber: row.rowNumber,
        code: row.values.code ? String(row.values.code) : undefined,
        message: errorMessage(error)
      });
    }

    const processedRows = index + 1;
    if (processedRows % 10 === 0 || processedRows === payload.rows.length) {
      await prisma.importJob.update({
        where: { id: importJob.id },
        data: {
          processedRows,
          importedRows,
          failedRows,
          errorJson: errors.length > 0 ? JSON.stringify(errors) : undefined
        }
      });
      await updateProgress(Math.round((processedRows / payload.rows.length) * 100));
    }
  }

  const status = failedRows === 0 ? "COMPLETED" : importedRows === 0 ? "FAILED" : "COMPLETED_WITH_ERRORS";
  const completed = await prisma.importJob.update({
    where: { id: importJob.id },
    data: {
      status,
      processedRows: payload.rows.length,
      importedRows,
      failedRows,
      errorJson: errors.length > 0 ? JSON.stringify(errors) : undefined,
      completedAt: new Date()
    }
  });

  await prisma.auditLog.create({
    data: {
      companyId: importJob.companyId,
      userId: importJob.requestedById ?? undefined,
      action: "import_completed",
      module: "master_data",
      recordType: payload.target === "masters" ? payload.masterKind : payload.target,
      recordId: importJob.id,
      afterValue: JSON.stringify({
        status,
        target: payload.target,
        masterKind: payload.masterKind,
        importedRows,
        failedRows
      })
    }
  });

  return {
    id: completed.id,
    status: completed.status,
    importedRows: completed.importedRows,
    failedRows: completed.failedRows
  };
}

async function processReportEmail(payload: ReportEmailPayload) {
  const delivery = await prisma.emailDeliveryLog.findUnique({ where: { id: payload.deliveryLogId } });
  if (!delivery) throw new Error(`Email delivery ${payload.deliveryLogId} was not found`);

  await prisma.emailDeliveryLog.update({
    where: { id: delivery.id },
    data: { status: "PROCESSING", provider: smtpConfigured() ? "SMTP" : "NOT_CONFIGURED" }
  });

  if (!smtpConfigured()) {
    const skipped = await prisma.emailDeliveryLog.update({
      where: { id: delivery.id },
      data: {
        status: "SKIPPED",
        error: "SMTP_HOST is not configured. Report email was prepared but not sent.",
        sentAt: new Date()
      }
    });
    return { id: skipped.id, status: skipped.status };
  }

  await sendSmtpMail({
    recipients: payload.recipients,
    subject: payload.subject,
    text: payload.text,
    attachment: payload.attachment
  });

  const sent = await prisma.emailDeliveryLog.update({
    where: { id: delivery.id },
    data: { status: "SENT", sentAt: new Date(), error: null }
  });

  await prisma.auditLog.create({
    data: {
      companyId: payload.companyId,
      userId: payload.requestedById,
      action: "report_email_sent",
      module: "reports",
      recordType: "EmailDeliveryLog",
      recordId: sent.id,
      afterValue: JSON.stringify({
        recipients: payload.recipients.length,
        subject: payload.subject,
        attachmentName: payload.attachment.filename
      })
    }
  });

  return { id: sent.id, status: sent.status };
}

async function createImportedRow(companyId: string, target: ImportTarget, masterKind: MasterKind | undefined, values: Record<string, string | number | boolean | undefined>) {
  const code = String(values.code);
  const name = String(values.name);

  if (target === "customers") {
    return prisma.customer.create({
      data: {
        companyId,
        code,
        name,
        contactPerson: values.contactPerson ? String(values.contactPerson) : undefined,
        email: values.email ? String(values.email).toLowerCase() : undefined,
        phone: values.phone ? String(values.phone) : undefined,
        status: values.status ? String(values.status) : "ACTIVE"
      }
    });
  }

  if (target === "suppliers") {
    return prisma.supplier.create({
      data: {
        companyId,
        code,
        name,
        contactPerson: values.contactPerson ? String(values.contactPerson) : undefined,
        email: values.email ? String(values.email).toLowerCase() : undefined,
        phone: values.phone ? String(values.phone) : undefined,
        status: values.status ? String(values.status) : "ACTIVE"
      }
    });
  }

  if (target === "items") {
    return prisma.item.create({
      data: {
        companyId,
        code,
        name,
        itemType: values.itemType ? String(values.itemType) : "Stock",
        sellingPrice: values.sellingPrice ? String(values.sellingPrice) : "0",
        purchasePrice: values.purchasePrice ? String(values.purchasePrice) : "0",
        minimumSellingPrice: values.sellingPrice ? String(values.sellingPrice) : "0",
        reorderLevel: values.reorderLevel ? String(values.reorderLevel) : "0"
      }
    });
  }

  const common = { companyId, code, name, isActive: true };
  return masterKind === "customer-categories"
    ? prisma.customerCategory.create({ data: common })
    : masterKind === "supplier-categories"
      ? prisma.supplierCategory.create({ data: common })
      : masterKind === "item-categories"
        ? prisma.itemCategory.create({ data: common })
        : masterKind === "units"
          ? prisma.unitOfMeasure.create({ data: common })
          : masterKind === "tax-codes"
            ? prisma.taxCode.create({ data: { ...common, ratePercent: values.ratePercent ? String(values.ratePercent) : "0" } })
            : masterKind === "currencies"
              ? prisma.currency.create({ data: { ...common, symbol: values.symbol ? String(values.symbol) : undefined } })
              : prisma.paymentTerm.create({ data: { ...common, days: Number(values.days ?? 0) } });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

async function sendSmtpMail(params: { recipients: string[]; subject: string; text: string; attachment: EmailAttachmentPayload }) {
  const host = requiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT ?? (process.env.SMTP_SECURE === "true" ? 465 : 587));
  const secure = process.env.SMTP_SECURE === "true";
  const username = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM ?? username;
  if (!from) throw new Error("SMTP_FROM or SMTP_USER must be configured");

  const socket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });
  const client = new SmtpClient(socket);
  await client.ready();
  await client.command(`EHLO ${process.env.SMTP_EHLO_HOST ?? "erp.local"}`);
  if (!secure && process.env.SMTP_STARTTLS !== "false") {
    await client.command("STARTTLS");
    await client.upgradeToTls(host);
    await client.command(`EHLO ${process.env.SMTP_EHLO_HOST ?? "erp.local"}`);
  }
  if (username && password) {
    await client.command("AUTH LOGIN");
    await client.command(Buffer.from(username).toString("base64"));
    await client.command(Buffer.from(password).toString("base64"));
  }

  await client.command(`MAIL FROM:<${from}>`);
  for (const recipient of params.recipients) {
    await client.command(`RCPT TO:<${recipient}>`);
  }
  await client.command("DATA");
  await client.writeData(buildMimeMessage(from, params));
  await client.command("QUIT", [221]);
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function buildMimeMessage(from: string, params: { recipients: string[]; subject: string; text: string; attachment: EmailAttachmentPayload }) {
  const boundary = `erp-${Date.now()}`;
  return [
    `From: ${from}`,
    `To: ${params.recipients.join(", ")}`,
    `Subject: ${params.subject.replace(/[\r\n]/g, " ")}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    params.text,
    "",
    `--${boundary}`,
    `Content-Type: ${params.attachment.contentType}; name="${params.attachment.filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${params.attachment.filename}"`,
    "",
    wrapBase64(params.attachment.base64Content),
    "",
    `--${boundary}--`,
    ".",
    ""
  ].join("\r\n");
}

function wrapBase64(value: string) {
  return value.replace(/.{1,76}/g, "$&\r\n").trim();
}

class SmtpClient {
  private buffer = "";
  private waiters: Array<() => void> = [];

  constructor(private socket: net.Socket | tls.TLSSocket) {
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
      this.waiters.splice(0).forEach((resolve) => resolve());
    });
  }

  ready() {
    return this.readResponse([220]);
  }

  async command(command: string, expected = [235, 250, 251, 354, 220, 221, 334]) {
    this.socket.write(`${command}\r\n`);
    return this.readResponse(expected);
  }

  async writeData(message: string) {
    this.socket.write(message.endsWith("\r\n") ? message : `${message}\r\n`);
    return this.readResponse([250]);
  }

  async upgradeToTls(host: string) {
    this.socket = tls.connect({ socket: this.socket, servername: host });
    this.buffer = "";
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
      this.waiters.splice(0).forEach((resolve) => resolve());
    });
  }

  private async readResponse(expected: number[]) {
    while (!this.hasCompleteResponse()) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    const response = this.takeResponse();
    const code = Number(response.slice(0, 3));
    if (!expected.includes(code)) throw new Error(`SMTP command failed: ${response.trim()}`);
    return response;
  }

  private hasCompleteResponse() {
    const lines = this.buffer.split(/\r?\n/).filter(Boolean);
    return lines.length > 0 && /^\d{3} /.test(lines[lines.length - 1]);
  }

  private takeResponse() {
    const lines = this.buffer.split(/\r?\n/);
    let consumed = 0;
    for (const [index, line] of lines.entries()) {
      if (/^\d{3} /.test(line)) {
        consumed = index + 1;
        break;
      }
    }
    const response = lines.slice(0, consumed).join("\n");
    this.buffer = lines.slice(consumed).join("\n");
    return response;
  }
}

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", async (job, error) => {
  console.error(`Job ${job?.id ?? "unknown"} failed`, error);

  if (job?.name === "master-data-import" && job.data.importJobId) {
    await prisma.importJob.updateMany({
      where: { id: String(job.data.importJobId), status: { notIn: ["COMPLETED", "COMPLETED_WITH_ERRORS"] } },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorJson: JSON.stringify([{ message: errorMessage(error) }])
      }
    });
  }

  if (job?.name === "report-email" && job.data.deliveryLogId) {
    await prisma.emailDeliveryLog.updateMany({
      where: { id: String(job.data.deliveryLogId), status: { notIn: ["SENT", "SKIPPED"] } },
      data: {
        status: "FAILED",
        error: errorMessage(error)
      }
    });
  }
});

process.on("SIGINT", async () => {
  await worker.close();
  await erpQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log("ERP worker started");
