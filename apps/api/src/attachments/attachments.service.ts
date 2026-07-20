import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAttachmentDto } from "./dto/create-attachment.dto";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

@Injectable()
export class AttachmentsService {
  private readonly maxBytes = 5 * 1024 * 1024;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService
  ) {}

  async list(companyId: string, recordType: string, recordId: string) {
    await this.assertRecordExists(companyId, recordType, recordId);
    return this.prisma.attachment.findMany({
      where: { companyId, recordType, recordId },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: {
          select: { id: true, displayName: true, email: true }
        }
      }
    });
  }

  async create(companyId: string, userId: string, dto: CreateAttachmentDto) {
    await this.assertRecordExists(companyId, dto.recordType, dto.recordId);

    if (!allowedMimeTypes.has(dto.mimeType)) {
      throw new BadRequestException("File type is not allowed");
    }

    const content = this.decodeBase64(dto.contentBase64);
    if (content.length === 0) {
      throw new BadRequestException("File is empty");
    }

    if (content.length > this.maxBytes) {
      throw new BadRequestException("File exceeds the 5 MB limit");
    }

    const checksum = createHash("sha256").update(content).digest("hex");
    const safeName = this.safeFileName(dto.fileName);
    const storedName = `${randomUUID()}-${safeName}`;
    const uploadsDir = this.uploadsDir();
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, storedName), content);

    const attachment = await this.prisma.attachment.create({
      data: {
        companyId,
        recordType: dto.recordType,
        recordId: dto.recordId,
        originalName: safeName,
        storedName,
        mimeType: dto.mimeType,
        sizeBytes: content.length,
        checksum,
        uploadedById: userId
      },
      include: {
        uploadedBy: {
          select: { id: true, displayName: true, email: true }
        }
      }
    });

    await this.audit.record({
      companyId,
      userId,
      action: "upload",
      module: "attachment",
      recordType: dto.recordType,
      recordId: dto.recordId,
      afterValue: {
        attachmentId: attachment.id,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        checksum: attachment.checksum
      }
    });

    return attachment;
  }

  async download(companyId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({ where: { id, companyId } });
    if (!attachment) throw new NotFoundException("Attachment not found");
    return {
      attachment,
      content: await readFile(path.join(this.uploadsDir(), attachment.storedName))
    };
  }

  private uploadsDir() {
    return this.config.get<string>("UPLOAD_DIR") ?? path.resolve(process.cwd(), "..", "..", "storage", "uploads");
  }

  private decodeBase64(contentBase64: string) {
    const cleaned = contentBase64.includes(",") ? contentBase64.split(",").pop() ?? "" : contentBase64;
    try {
      return Buffer.from(cleaned, "base64");
    } catch {
      throw new BadRequestException("Invalid file content");
    }
  }

  private safeFileName(fileName: string) {
    return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  }

  private async assertRecordExists(companyId: string, recordType: string, recordId: string) {
    const record =
      recordType === "customer"
        ? await this.prisma.customer.findFirst({ where: { id: recordId, companyId }, select: { id: true } })
        : recordType === "supplier"
          ? await this.prisma.supplier.findFirst({ where: { id: recordId, companyId }, select: { id: true } })
          : recordType === "item"
            ? await this.prisma.item.findFirst({ where: { id: recordId, companyId }, select: { id: true } })
            : await this.findSupportingMaster(companyId, recordId);

    if (!record) {
      throw new NotFoundException("Attachment target record not found");
    }
  }

  private async findSupportingMaster(companyId: string, recordId: string) {
    return (
      (await this.prisma.customerCategory.findFirst({ where: { id: recordId, companyId }, select: { id: true } })) ??
      (await this.prisma.supplierCategory.findFirst({ where: { id: recordId, companyId }, select: { id: true } })) ??
      (await this.prisma.itemCategory.findFirst({ where: { id: recordId, companyId }, select: { id: true } })) ??
      (await this.prisma.unitOfMeasure.findFirst({ where: { id: recordId, companyId }, select: { id: true } })) ??
      (await this.prisma.taxCode.findFirst({ where: { id: recordId, companyId }, select: { id: true } })) ??
      (await this.prisma.currency.findFirst({ where: { id: recordId, companyId }, select: { id: true } })) ??
      (await this.prisma.paymentTerm.findFirst({ where: { id: recordId, companyId }, select: { id: true } }))
    );
  }
}
