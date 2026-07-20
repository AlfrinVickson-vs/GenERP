import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrgUnitDto } from "./dto/create-org-unit.dto";

type OrgKind = "branch" | "department" | "warehouse" | "costCenter";

@Injectable()
export class OrganisationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(companyId: string, kind: OrgKind) {
    if (kind === "branch") {
      return this.prisma.branch.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    }
    if (kind === "department") {
      return this.prisma.department.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    }
    if (kind === "warehouse") {
      return this.prisma.warehouse.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    }
    return this.prisma.costCenter.findMany({ where: { companyId }, orderBy: { code: "asc" } });
  }

  async create(companyId: string, userId: string, kind: OrgKind, dto: CreateOrgUnitDto) {
    const created =
      kind === "branch"
        ? await this.prisma.branch.create({
            data: {
              companyId,
              code: dto.code,
              name: dto.name,
              isActive: dto.isActive ?? true,
              address: dto.address
            }
          })
        : kind === "department"
          ? await this.prisma.department.create({
              data: {
                companyId,
                code: dto.code,
                name: dto.name,
                isActive: dto.isActive ?? true,
                branchId: dto.branchId
              }
            })
          : kind === "warehouse"
            ? await this.prisma.warehouse.create({
                data: {
                  companyId,
                  code: dto.code,
                  name: dto.name,
                  isActive: dto.isActive ?? true,
                  branchId: dto.branchId
                }
              })
            : await this.prisma.costCenter.create({
                data: {
                  companyId,
                  code: dto.code,
                  name: dto.name,
                  isActive: dto.isActive ?? true
                }
              });
    await this.audit.record({
      companyId,
      userId,
      action: "create",
      module: kind,
      recordType: kind,
      recordId: created.id,
      afterValue: created
    });
    return created;
  }

  async update(companyId: string, userId: string, kind: OrgKind, id: string, dto: CreateOrgUnitDto) {
    const before =
      kind === "branch"
        ? await this.prisma.branch.findFirstOrThrow({ where: { id, companyId } })
        : kind === "department"
          ? await this.prisma.department.findFirstOrThrow({ where: { id, companyId } })
          : kind === "warehouse"
            ? await this.prisma.warehouse.findFirstOrThrow({ where: { id, companyId } })
            : await this.prisma.costCenter.findFirstOrThrow({ where: { id, companyId } });

    const updated =
      kind === "branch"
        ? await this.prisma.branch.update({
            where: { id },
            data: {
              code: dto.code,
              name: dto.name,
              isActive: dto.isActive ?? true,
              address: dto.address
            }
          })
        : kind === "department"
          ? await this.prisma.department.update({
              where: { id },
              data: {
                code: dto.code,
                name: dto.name,
                isActive: dto.isActive ?? true,
                branchId: dto.branchId
              }
            })
          : kind === "warehouse"
            ? await this.prisma.warehouse.update({
                where: { id },
                data: {
                  code: dto.code,
                  name: dto.name,
                  isActive: dto.isActive ?? true,
                  branchId: dto.branchId
                }
              })
            : await this.prisma.costCenter.update({
                where: { id },
                data: {
                  code: dto.code,
                  name: dto.name,
                  isActive: dto.isActive ?? true
                }
              });
    await this.audit.record({
      companyId,
      userId,
      action: "update",
      module: kind,
      recordType: kind,
      recordId: id,
      beforeValue: before,
      afterValue: updated
    });
    return updated;
  }
}
