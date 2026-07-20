import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async get(companyId: string) {
    return this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  }

  async update(companyId: string, userId: string, dto: UpdateCompanyDto) {
    const before = await this.get(companyId);
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: dto
    });
    await this.audit.record({
      companyId,
      userId,
      action: "update",
      module: "company",
      recordType: "Company",
      recordId: companyId,
      beforeValue: before,
      afterValue: updated
    });
    return updated;
  }
}
