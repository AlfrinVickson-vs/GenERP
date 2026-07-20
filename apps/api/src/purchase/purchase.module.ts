import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PurchaseController } from "./purchase.controller";
import { PurchaseService } from "./purchase.service";

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PurchaseController],
  providers: [PurchaseService]
})
export class PurchaseModule {}
