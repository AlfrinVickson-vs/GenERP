import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRoleDto, UpdateRoleDto } from "./dto/create-role.dto";

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async list() {
    return this.prisma.role.findMany({
      orderBy: { name: "asc" },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });
  }

  async permissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
  }

  async create(companyId: string, userId: string, dto: CreateRoleDto) {
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: dto.permissions } }
    });

    if (permissions.length !== dto.permissions.length) {
      throw new BadRequestException("One or more permissions are invalid");
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        isSystem: dto.isSystem ?? false,
        permissions: {
          create: permissions.map((permission) => ({
            permissionId: permission.id
          }))
        }
      },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });

    await this.audit.record({
      companyId,
      userId,
      action: "create",
      module: "role",
      recordType: "Role",
      recordId: role.id,
      afterValue: role
    });

    return role;
  }

  async update(companyId: string, userId: string, id: string, dto: UpdateRoleDto) {
    const before = await this.prisma.role.findUniqueOrThrow({
      where: { id },
      include: { permissions: { include: { permission: true } } }
    });
    if (before.isSystem) throw new BadRequestException("System roles cannot be edited");

    const permissions = dto.permissions
      ? await this.prisma.permission.findMany({ where: { code: { in: dto.permissions } } })
      : undefined;
    if (dto.permissions && permissions?.length !== dto.permissions.length) {
      throw new BadRequestException("One or more permissions are invalid");
    }

    const role = await this.prisma.$transaction(async (tx) => {
      if (permissions) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({ roleId: id, permissionId: permission.id }))
        });
      }

      return tx.role.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description?.trim() || undefined
        },
        include: { permissions: { include: { permission: true } } }
      });
    });

    await this.audit.record({
      companyId,
      userId,
      action: "update",
      module: "role",
      recordType: "Role",
      recordId: role.id,
      beforeValue: before,
      afterValue: role
    });

    return role;
  }
}
