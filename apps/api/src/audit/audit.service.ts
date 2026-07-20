import { Injectable } from "@nestjs/common";
import { maskSensitive } from "../common/permissions";
import { PrismaService } from "../prisma/prisma.service";

type AuditInput = {
  companyId?: string | null;
  userId?: string | null;
  action: string;
  module: string;
  recordType?: string;
  recordId?: string;
  ipAddress?: string;
  userAgent?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string;
  correlationId?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput) {
    const beforeValue =
      input.beforeValue === undefined || input.beforeValue === null
        ? undefined
        : JSON.stringify(maskSensitive(input.beforeValue));
    const afterValue =
      input.afterValue === undefined || input.afterValue === null
        ? undefined
        : JSON.stringify(maskSensitive(input.afterValue));

    return this.prisma.auditLog.create({
      data: {
        companyId: input.companyId ?? undefined,
        userId: input.userId ?? undefined,
        action: input.action,
        module: input.module,
        recordType: input.recordType,
        recordId: input.recordId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        beforeValue,
        afterValue,
        reason: input.reason,
        correlationId: input.correlationId
      }
    });
  }

  async list(companyId: string) {
    return this.prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      }
    });
  }
}
