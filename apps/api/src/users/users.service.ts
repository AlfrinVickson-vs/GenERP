import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const UserStatus = {
  INVITED: "INVITED"
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService
  ) {}

  list(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        status: true,
        mfaEnabled: true,
        lastLoginAt: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });
  }

  async create(companyId: string, actorId: string, dto: CreateUserDto) {
    const passwordHash = await this.auth.hashPassword(dto.temporaryPassword);
    const user = await this.prisma.user.create({
      data: {
        companyId,
        email: dto.email.toLowerCase(),
        username: dto.username,
        displayName: dto.displayName,
        passwordHash,
        status: dto.status ?? UserStatus.INVITED,
        invitedAt: new Date(),
        roles: {
          create: dto.roleIds.map((roleId) => ({ roleId }))
        }
      },
      include: { roles: { include: { role: true } } }
    });
    await this.audit.record({
      companyId,
      userId: actorId,
      action: "create",
      module: "user",
      recordType: "User",
      recordId: user.id,
      afterValue: user
    });
    return user;
  }

  async update(companyId: string, actorId: string, id: string, dto: UpdateUserDto) {
    const before = await this.prisma.user.findFirstOrThrow({
      where: { id, companyId },
      include: { roles: true }
    });

    const user = await this.prisma.$transaction(async (tx) => {
      if (dto.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        for (const roleId of dto.roleIds) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: id, roleId } },
            update: {},
            create: { userId: id, roleId }
          });
        }
      }

      return tx.user.update({
        where: { id },
        data: {
          email: dto.email?.toLowerCase(),
          username: dto.username,
          displayName: dto.displayName,
          status: dto.status
        },
        include: { roles: { include: { role: true } } }
      });
    });

    await this.audit.record({
      companyId,
      userId: actorId,
      action: "update",
      module: "user",
      recordType: "User",
      recordId: id,
      beforeValue: before,
      afterValue: user
    });
    return user;
  }
}
