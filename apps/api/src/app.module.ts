import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuditModule } from "./audit/audit.module";
import { AccountingModule } from "./accounting/accounting.module";
import { AttachmentsModule } from "./attachments/attachments.module";
import { AuthModule } from "./auth/auth.module";
import { AuthGuard } from "./auth/guards/auth.guard";
import { PermissionsGuard } from "./auth/guards/permissions.guard";
import { CompanyModule } from "./company/company.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { HrModule } from "./hr/hr.module";
import { InventoryModule } from "./inventory/inventory.module";
import { MasterDataModule } from "./master-data/master-data.module";
import { OrganisationModule } from "./organisation/organisation.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PurchaseModule } from "./purchase/purchase.module";
import { ReportsModule } from "./reports/reports.module";
import { RolesModule } from "./roles/roles.module";
import { SalesModule } from "./sales/sales.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AccountingModule,
    AttachmentsModule,
    AuthModule,
    CompanyModule,
    OrganisationModule,
    RolesModule,
    UsersModule,
    DashboardModule,
    HrModule,
    InventoryModule,
    MasterDataModule,
    SalesModule,
    PurchaseModule,
    ReportsModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard }
  ]
})
export class AppModule {}
