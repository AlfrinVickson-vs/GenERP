import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const LoginResult = {
  FAILED: "FAILED"
} as const;

type DashboardSummary = {
  users: number;
  roles: number;
  branches: number;
  departments: number;
  warehouses: number;
  pendingApprovals: number;
  auditEventsToday: number;
  failedLoginsToday: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(companyId: string): Promise<DashboardSummary> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [users, roles, branches, departments, warehouses, pendingApprovals, auditEventsToday, failedLoginsToday] =
      await Promise.all([
        this.prisma.user.count({ where: { companyId } }),
        this.prisma.role.count(),
        this.prisma.branch.count({ where: { companyId } }),
        this.prisma.department.count({ where: { companyId } }),
        this.prisma.warehouse.count({ where: { companyId } }),
        this.prisma.approvalRule.count({ where: { isActive: true } }),
        this.prisma.auditLog.count({ where: { companyId, createdAt: { gte: startOfDay } } }),
        this.prisma.loginHistory.count({
          where: {
            createdAt: { gte: startOfDay },
            result: LoginResult.FAILED
          }
        })
      ]);

    return {
      users,
      roles,
      branches,
      departments,
      warehouses,
      pendingApprovals,
      auditEventsToday,
      failedLoginsToday
    };
  }
}
