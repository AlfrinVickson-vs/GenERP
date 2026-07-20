import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AccountingController } from "./accounting.controller";
import { AccountingService } from "./accounting.service";

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AccountingController],
  providers: [AccountingService]
})
export class AccountingModule {}
