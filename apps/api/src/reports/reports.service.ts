import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { EmailReportDto } from "./dto/report-email.dto";
import { CreateReportScheduleDto } from "./dto/report-schedule.dto";

export type ReportKind = "dashboard" | "operational" | "financial";
export type ReportExportFormat = "csv" | "pdf";

type ReportValue = string | number | boolean | null;
type ReportRow = Record<string, ReportValue>;

type ReportTable = {
  title: string;
  rows: ReportRow[];
};

type ReportPayload = {
  generatedAt: string;
  metrics: ReportRow[];
  tables: ReportTable[];
};

type StatusCount = {
  status: string;
  _count: { _all: number };
};

@Injectable()
export class ReportsService {
  private emailQueue?: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async dashboard(companyId: string): Promise<ReportPayload> {
    const [users, customers, suppliers, items, salesTotal, purchaseTotal, inventoryBalances, pendingApprovals] = await Promise.all([
      this.prisma.user.count({ where: { companyId } }),
      this.prisma.customer.count({ where: { companyId, status: "ACTIVE" } }),
      this.prisma.supplier.count({ where: { companyId, status: "ACTIVE" } }),
      this.prisma.item.count({ where: { companyId, isActive: true } }),
      this.prisma.salesInvoice.aggregate({ where: { companyId }, _sum: { total: true, paidAmount: true } }),
      this.prisma.supplierInvoice.aggregate({ where: { companyId }, _sum: { total: true, paidAmount: true } }),
      this.prisma.stockBalance.findMany({ where: { companyId }, include: { item: { select: { code: true, name: true } }, warehouse: { select: { code: true } } } }),
      this.prisma.approvalRequest.count({ where: { companyId, status: "PENDING" } })
    ]);

    const inventoryValue = inventoryBalances.reduce((sum, row) => sum + Number(row.quantityOnHand) * Number(row.averageCost), 0);
    const salesAmount = Number(salesTotal._sum.total ?? 0);
    const salesPaid = Number(salesTotal._sum.paidAmount ?? 0);
    const purchaseAmount = Number(purchaseTotal._sum.total ?? 0);
    const purchasePaid = Number(purchaseTotal._sum.paidAmount ?? 0);

    return {
      generatedAt: new Date().toISOString(),
      metrics: [
        { id: "users", section: "Administration", metric: "Users", value: users },
        { id: "customers", section: "Master Data", metric: "Active customers", value: customers },
        { id: "suppliers", section: "Master Data", metric: "Active suppliers", value: suppliers },
        { id: "items", section: "Inventory", metric: "Active items", value: items },
        { id: "sales", section: "Sales", metric: "Sales invoiced", value: this.decimalText(salesAmount) },
        { id: "receivables", section: "Sales", metric: "Receivables outstanding", value: this.decimalText(salesAmount - salesPaid) },
        { id: "purchases", section: "Purchasing", metric: "Supplier invoices", value: this.decimalText(purchaseAmount) },
        { id: "payables", section: "Purchasing", metric: "Payables outstanding", value: this.decimalText(purchaseAmount - purchasePaid) },
        { id: "inventory-value", section: "Inventory", metric: "Inventory value", value: this.decimalText(inventoryValue) },
        { id: "pending-approvals", section: "Approvals", metric: "Pending approvals", value: pendingApprovals }
      ],
      tables: [
        {
          title: "Inventory Value By Warehouse",
          rows: this.groupRows(
            inventoryBalances.map((row) => ({
              key: row.warehouse.code,
              section: "Inventory",
              metric: row.warehouse.code,
              value: Number(row.quantityOnHand) * Number(row.averageCost)
            }))
          )
        }
      ]
    };
  }

  async operational(companyId: string): Promise<ReportPayload> {
    const now = new Date();
    const [salesStatus, purchaseStatus, invoiceStatus, supplierInvoiceStatus, stockBalances, overdueActivities, overdueApprovals] = await Promise.all([
      this.prisma.salesOrder.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true } }),
      this.prisma.purchaseOrder.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true } }),
      this.prisma.salesInvoice.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true } }),
      this.prisma.supplierInvoice.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true } }),
      this.prisma.stockBalance.findMany({
        where: { companyId },
        include: { item: { select: { code: true, name: true, reorderLevel: true, safetyStock: true } }, warehouse: { select: { code: true, name: true } } },
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.activity.findMany({
        where: { companyId, status: { not: "COMPLETED" }, dueAt: { lt: now } },
        take: 25,
        orderBy: { dueAt: "asc" },
        include: { customer: { select: { code: true, name: true } }, assignedTo: { select: { displayName: true } } }
      }),
      this.prisma.approvalStep.findMany({
        where: { status: "PENDING", dueAt: { lt: now }, approvalRequest: { companyId, status: "PENDING" } },
        take: 25,
        orderBy: { dueAt: "asc" },
        include: { approvalRequest: { select: { documentType: true, documentNo: true } } }
      })
    ]);

    const stockAlerts = stockBalances
      .filter((row) => Number(row.quantityOnHand) <= Math.max(Number(row.item.reorderLevel), Number(row.item.safetyStock)))
      .map((row) => ({
        id: row.id,
        itemCode: row.item.code,
        itemName: row.item.name,
        warehouse: row.warehouse.code,
        quantityOnHand: this.decimalText(Number(row.quantityOnHand)),
        reorderLevel: this.decimalText(Number(row.item.reorderLevel)),
        safetyStock: this.decimalText(Number(row.item.safetyStock))
      }));

    return {
      generatedAt: new Date().toISOString(),
      metrics: [
        { id: "open-sales-orders", section: "Sales", metric: "Open sales orders", value: this.statusValue(salesStatus, "ISSUED") + this.statusValue(salesStatus, "PARTIALLY_DELIVERED") },
        { id: "open-purchase-orders", section: "Purchasing", metric: "Open purchase orders", value: this.statusValue(purchaseStatus, "ISSUED") + this.statusValue(purchaseStatus, "PARTIALLY_RECEIVED") },
        { id: "sales-invoices", section: "Sales", metric: "Sales invoice statuses", value: invoiceStatus.length },
        { id: "supplier-invoices", section: "Purchasing", metric: "Supplier invoice statuses", value: supplierInvoiceStatus.length },
        { id: "stock-alerts", section: "Inventory", metric: "Stock alerts", value: stockAlerts.length },
        { id: "overdue-activities", section: "CRM", metric: "Overdue activities", value: overdueActivities.length },
        { id: "overdue-approvals", section: "Approvals", metric: "Overdue approvals", value: overdueApprovals.length }
      ],
      tables: [
        { title: "Sales Orders By Status", rows: this.statusRows(salesStatus) },
        { title: "Purchase Orders By Status", rows: this.statusRows(purchaseStatus) },
        { title: "Invoice Statuses", rows: [...this.statusRows(invoiceStatus, "Sales"), ...this.statusRows(supplierInvoiceStatus, "Purchase")] },
        { title: "Stock Alerts", rows: stockAlerts },
        {
          title: "Overdue Activities",
          rows: overdueActivities.map((activity) => ({
            id: activity.id,
            code: activity.code,
            subject: activity.subject,
            priority: activity.priority,
            dueAt: activity.dueAt?.toISOString() ?? null,
            customer: activity.customer?.code ?? null,
            assignedTo: activity.assignedTo?.displayName ?? null
          }))
        },
        {
          title: "Overdue Approvals",
          rows: overdueApprovals.map((step) => ({
            id: step.id,
            documentType: step.approvalRequest.documentType,
            documentNo: step.approvalRequest.documentNo,
            approverRole: step.approverRole,
            dueAt: step.dueAt?.toISOString() ?? null
          }))
        }
      ]
    };
  }

  async financial(companyId: string): Promise<ReportPayload> {
    const [accounts, sales, purchases] = await Promise.all([
      this.prisma.account.findMany({
        where: { companyId },
        include: { journalLines: { where: { journalEntry: { status: "POSTED" } } } },
        orderBy: { code: "asc" }
      }),
      this.prisma.salesInvoice.findMany({ where: { companyId }, include: { customer: { select: { code: true, name: true } } }, orderBy: { dueDate: "asc" } }),
      this.prisma.supplierInvoice.findMany({ where: { companyId }, include: { supplier: { select: { code: true, name: true } } }, orderBy: { invoiceDate: "asc" } })
    ]);

    const trialRows = accounts.map((account) => {
      const debit = account.journalLines.reduce((sum, line) => sum + Number(line.debit), 0);
      const credit = account.journalLines.reduce((sum, line) => sum + Number(line.credit), 0);
      const balance = account.normalBalance === "DEBIT" ? debit - credit : credit - debit;
      return {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit: this.decimalText(debit),
        credit: this.decimalText(credit),
        balance: this.decimalText(balance)
      };
    });
    const totalRevenue = trialRows.filter((row) => row.type === "REVENUE").reduce((sum, row) => sum + Number(row.balance), 0);
    const totalExpenses = trialRows.filter((row) => row.type === "EXPENSE").reduce((sum, row) => sum + Number(row.balance), 0);
    const totalAssets = trialRows.filter((row) => row.type === "ASSET").reduce((sum, row) => sum + Number(row.balance), 0);
    const totalLiabilities = trialRows.filter((row) => row.type === "LIABILITY").reduce((sum, row) => sum + Number(row.balance), 0);
    const receivables = sales.map((invoice) => ({
      id: invoice.id,
      documentNo: invoice.invoiceNo,
      party: `${invoice.customer.code} - ${invoice.customer.name}`,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      outstanding: this.decimalText(Number(invoice.total) - Number(invoice.paidAmount)),
      status: invoice.status
    })).filter((row) => Number(row.outstanding) > 0);
    const payables = purchases.map((invoice) => ({
      id: invoice.id,
      documentNo: invoice.invoiceNo,
      party: `${invoice.supplier.code} - ${invoice.supplier.name}`,
      outstanding: this.decimalText(Number(invoice.total) - Number(invoice.paidAmount)),
      status: invoice.status,
      matchingStatus: invoice.matchingStatus
    })).filter((row) => Number(row.outstanding) > 0);

    return {
      generatedAt: new Date().toISOString(),
      metrics: [
        { id: "revenue", section: "Profit And Loss", metric: "Revenue", value: this.decimalText(totalRevenue) },
        { id: "expenses", section: "Profit And Loss", metric: "Expenses", value: this.decimalText(totalExpenses) },
        { id: "net-income", section: "Profit And Loss", metric: "Net income", value: this.decimalText(totalRevenue - totalExpenses) },
        { id: "assets", section: "Balance Sheet", metric: "Assets", value: this.decimalText(totalAssets) },
        { id: "liabilities", section: "Balance Sheet", metric: "Liabilities", value: this.decimalText(totalLiabilities) },
        { id: "receivables", section: "Ageing", metric: "Receivables outstanding", value: this.decimalText(receivables.reduce((sum, row) => sum + Number(row.outstanding), 0)) },
        { id: "payables", section: "Ageing", metric: "Payables outstanding", value: this.decimalText(payables.reduce((sum, row) => sum + Number(row.outstanding), 0)) }
      ],
      tables: [
        { title: "Trial Balance", rows: trialRows },
        { title: "Receivables", rows: receivables },
        { title: "Payables", rows: payables }
      ]
    };
  }

  integrationStatus() {
    return {
      generatedAt: new Date().toISOString(),
      email: {
        provider: process.env.SMTP_HOST ? "SMTP" : "Not configured",
        status: process.env.SMTP_HOST ? "CONFIGURED" : "NOT_CONFIGURED",
        from: process.env.SMTP_FROM ?? null
      },
      tally: {
        status: process.env.TALLY_EXPORT_PATH ? "CONFIGURED" : "FILE_EXPORT_READY",
        exportPath: process.env.TALLY_EXPORT_PATH ?? null,
        format: "JSON_VOUCHER_FOUNDATION"
      },
      apiDocs: {
        status: "ENABLED",
        url: "/docs"
      }
    };
  }

  async tallyVouchers(companyId: string) {
    const journals = await this.prisma.journalEntry.findMany({
      where: { companyId, status: "POSTED" },
      take: 100,
      orderBy: { entryDate: "desc" },
      include: { lines: { include: { account: { select: { code: true, name: true } } }, orderBy: { account: { code: "asc" } } } }
    });
    return {
      generatedAt: new Date().toISOString(),
      source: "POSTED_JOURNALS",
      vouchers: journals.map((journal) => ({
        voucherNo: journal.journalNo,
        voucherDate: journal.entryDate.toISOString(),
        voucherType: journal.sourceType,
        narration: journal.memo,
        sourceDocumentId: journal.sourceDocumentId,
        totalDebit: journal.totalDebit.toString(),
        totalCredit: journal.totalCredit.toString(),
        lines: journal.lines.map((line) => ({
          ledgerCode: line.account.code,
          ledgerName: line.account.name,
          debit: line.debit.toString(),
          credit: line.credit.toString(),
          description: line.description
        }))
      }))
    };
  }

  emailDeliveries(companyId: string) {
    return this.prisma.emailDeliveryLog.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { requestedBy: { select: { displayName: true, email: true } } }
    });
  }

  reportSchedules(companyId: string) {
    return this.prisma.reportSchedule.findMany({
      where: { companyId },
      orderBy: [{ status: "asc" }, { nextRunAt: "asc" }],
      include: { createdBy: { select: { displayName: true, email: true } } }
    });
  }

  async createReportSchedule(companyId: string, userId: string, dto: CreateReportScheduleDto) {
    const nextRunAt = dto.nextRunAt ? this.parseDate(dto.nextRunAt, "nextRunAt") : this.nextScheduledRun(dto.frequency, new Date());
    return this.prisma.reportSchedule.create({
      data: {
        companyId,
        createdById: userId,
        name: dto.name.trim(),
        kind: dto.kind,
        format: dto.format ?? "csv",
        recipientsJson: JSON.stringify(dto.recipients.map((recipient) => recipient.trim().toLowerCase())),
        subject: dto.subject?.trim() || undefined,
        frequency: dto.frequency,
        nextRunAt
      },
      include: { createdBy: { select: { displayName: true, email: true } } }
    });
  }

  async runDueReportSchedules(companyId: string, userId: string) {
    const due = await this.prisma.reportSchedule.findMany({
      where: { companyId, status: "ACTIVE", nextRunAt: { lte: new Date() } },
      orderBy: { nextRunAt: "asc" },
      take: 25
    });
    const results = [];
    for (const schedule of due) {
      results.push(await this.runReportSchedule(companyId, userId, schedule.id));
    }
    return { processed: results.length, results };
  }

  async runReportSchedule(companyId: string, userId: string, id: string) {
    const schedule = await this.prisma.reportSchedule.findFirst({ where: { id, companyId } });
    if (!schedule) throw new BadRequestException("Report schedule was not found");
    if (schedule.status !== "ACTIVE") throw new BadRequestException("Report schedule is not active");
    const delivery = await this.queueReportEmail(companyId, userId, schedule.kind as ReportKind, {
      recipients: this.parseRecipients(schedule.recipientsJson),
      subject: schedule.subject || `${schedule.name} report`,
      format: schedule.format as ReportExportFormat
    });

    return this.prisma.reportSchedule.update({
      where: { id: schedule.id },
      data: {
        lastRunAt: new Date(),
        lastDeliveryLogId: delivery.id,
        nextRunAt: this.nextScheduledRun(schedule.frequency, new Date())
      },
      include: { createdBy: { select: { displayName: true, email: true } } }
    });
  }

  async queueReportEmail(companyId: string, userId: string, kind: ReportKind, dto: EmailReportDto) {
    const format = dto.format ?? "csv";
    const exported = await this.exportReport(companyId, kind, format);
    const subject = dto.subject?.trim() || `${this.titleCase(kind)} report`;
    const delivery = await this.prisma.emailDeliveryLog.create({
      data: {
        companyId,
        requestedById: userId,
        kind,
        format,
        recipientsJson: JSON.stringify(dto.recipients.map((recipient) => recipient.trim().toLowerCase())),
        subject,
        status: "QUEUED",
        provider: this.config.get<string>("SMTP_HOST") ? "SMTP" : "NOT_CONFIGURED",
        attachmentName: exported.filename
      },
      include: { requestedBy: { select: { displayName: true, email: true } } }
    });

    if (!this.config.get<string>("SMTP_HOST")) {
      return this.prisma.emailDeliveryLog.update({
        where: { id: delivery.id },
        data: {
          status: "SKIPPED",
          sentAt: new Date(),
          error: "SMTP_HOST is not configured. Report email was prepared but not sent."
        },
        include: { requestedBy: { select: { displayName: true, email: true } } }
      });
    }

    try {
      const queued = await this.getEmailQueue().add(
        "report-email",
        {
          deliveryLogId: delivery.id,
          companyId,
          requestedById: userId,
          recipients: dto.recipients.map((recipient) => recipient.trim().toLowerCase()),
          subject,
          text: `Attached is the ${this.titleCase(kind)} report generated from the ERP.`,
          attachment: {
            filename: exported.filename,
            contentType: exported.contentType,
            base64Content: exported.content.toString("base64")
          }
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: 50,
          removeOnFail: 100
        }
      );

      return this.prisma.emailDeliveryLog.update({
        where: { id: delivery.id },
        data: { queueJobId: String(queued.id ?? "") },
        include: { requestedBy: { select: { displayName: true, email: true } } }
      });
    } catch (error) {
      return this.prisma.emailDeliveryLog.update({
        where: { id: delivery.id },
        data: {
          status: "FAILED",
          error: `Unable to queue email delivery: ${this.errorMessage(error)}`
        },
        include: { requestedBy: { select: { displayName: true, email: true } } }
      });
    }
  }

  async exportReport(companyId: string, kind: ReportKind, format: ReportExportFormat) {
    const payload = await this.reportPayload(companyId, kind);
    const rows = this.flattenReport(payload);
    if (format === "csv") {
      return {
        filename: `${kind}-report.csv`,
        contentType: "text/csv; charset=utf-8",
        content: Buffer.from(this.toCsv(rows), "utf8")
      };
    }
    if (format === "pdf") {
      return {
        filename: `${kind}-report.pdf`,
        contentType: "application/pdf",
        content: this.toPdf(`${this.titleCase(kind)} Report`, rows)
      };
    }
    throw new BadRequestException("Unsupported export format");
  }

  private reportPayload(companyId: string, kind: ReportKind) {
    if (kind === "dashboard") return this.dashboard(companyId);
    if (kind === "operational") return this.operational(companyId);
    if (kind === "financial") return this.financial(companyId);
    throw new BadRequestException("Unsupported report kind");
  }

  private flattenReport(payload: ReportPayload) {
    const metricRows = payload.metrics.map((row) => ({ section: row.section, table: "Metrics", ...row }));
    const tableRows = payload.tables.flatMap((table) => table.rows.map((row) => ({ section: String(row.section ?? table.title), table: table.title, ...row })));
    return [{ section: "Generated", table: "Report", metric: "Generated at", value: payload.generatedAt }, ...metricRows, ...tableRows];
  }

  private toCsv(rows: ReportRow[]) {
    const headers = Array.from(rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>()));
    return [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => this.csvValue(row[header])).join(","))
    ].join("\n");
  }

  private toPdf(title: string, rows: ReportRow[]) {
    const lines = [
      title,
      `Generated ${new Date().toISOString()}`,
      "",
      ...rows.slice(0, 70).map((row) => Object.entries(row).map(([key, value]) => `${key}: ${String(value ?? "")}`).join(" | ").slice(0, 115))
    ];
    const stream = lines.map((line, index) => `BT /F1 9 Tf 40 ${780 - index * 11} Td (${this.pdfText(line)}) Tj ET`).join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(pdf, "utf8"));
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n");
    pdf += `\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(pdf, "utf8");
  }

  private statusRows(rows: StatusCount[], section = "Status") {
    return rows.map((row) => ({ id: `${section}-${row.status}`, section, status: row.status, count: row._count._all }));
  }

  private statusValue(rows: StatusCount[], status: string) {
    return rows.find((row) => row.status === status)?._count._all ?? 0;
  }

  private groupRows(rows: Array<{ key: string; section: string; metric: string; value: number }>) {
    const grouped = new Map<string, { section: string; metric: string; value: number }>();
    for (const row of rows) {
      const current = grouped.get(row.key) ?? { section: row.section, metric: row.metric, value: 0 };
      current.value += row.value;
      grouped.set(row.key, current);
    }
    return Array.from(grouped.entries()).map(([id, row]) => ({ id, section: row.section, metric: row.metric, value: this.decimalText(row.value) }));
  }

  private csvValue(value: ReportValue) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  private pdfText(value: string) {
    return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  private titleCase(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private parseRecipients(value: string) {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) throw new BadRequestException("Report schedule does not have recipients");
    return parsed.map(String);
  }

  private parseDate(value: string, field: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException(`${field} must be a valid date`);
    return parsed;
  }

  private nextScheduledRun(frequency: string, from: Date) {
    const next = new Date(from);
    if (frequency === "DAILY") next.setDate(next.getDate() + 1);
    else if (frequency === "MONTHLY") next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + 7);
    return next;
  }

  private getEmailQueue() {
    if (!this.emailQueue) {
      const redisUrl = this.config.get<string>("REDIS_URL", "redis://localhost:6379");
      const parsedRedisUrl = new URL(redisUrl);
      this.emailQueue = new Queue("erp-background-jobs", {
        connection: {
          host: parsedRedisUrl.hostname,
          port: Number(parsedRedisUrl.port || 6379),
          password: parsedRedisUrl.password || undefined
        }
      });
    }

    return this.emailQueue;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private decimalText(value: number) {
    return value.toFixed(4).replace(/\.?0+$/, "");
  }
}
