import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import {
  CreateOpeningStockDto,
  ImportInventoryDto,
  CreateStockAdjustmentDto,
  CreateStockCountDto,
  CreateStockTransferDto
} from "./dto/create-opening-stock.dto";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("stock-balances")
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  stockBalances(@Req() req: AuthenticatedRequest) {
    return this.inventory.stockBalances(req.user!.companyId);
  }

  @Get("opening-stock")
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  openingStockEntries(@Req() req: AuthenticatedRequest) {
    return this.inventory.openingStockEntries(req.user!.companyId);
  }

  @Get("ledger")
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  stockLedger(@Req() req: AuthenticatedRequest) {
    return this.inventory.stockLedger(req.user!.companyId);
  }

  @Get("valuation")
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  valuation(@Req() req: AuthenticatedRequest) {
    return this.inventory.valuation(req.user!.companyId);
  }

  @Get("transfers")
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  stockTransfers(@Req() req: AuthenticatedRequest) {
    return this.inventory.stockTransfers(req.user!.companyId);
  }

  @Post("transfers")
  @RequirePermissions(PERMISSIONS.INVENTORY_EDIT)
  createStockTransfer(@Req() req: AuthenticatedRequest, @Body() dto: CreateStockTransferDto) {
    return this.inventory.createStockTransfer(req.user!.companyId, req.user!.id, dto);
  }

  @Get("counts")
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  stockCounts(@Req() req: AuthenticatedRequest) {
    return this.inventory.stockCounts(req.user!.companyId);
  }

  @Post("counts")
  @RequirePermissions(PERMISSIONS.INVENTORY_EDIT)
  createStockCount(@Req() req: AuthenticatedRequest, @Body() dto: CreateStockCountDto) {
    return this.inventory.createStockCount(req.user!.companyId, req.user!.id, dto);
  }

  @Get("adjustments")
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  stockAdjustments(@Req() req: AuthenticatedRequest) {
    return this.inventory.stockAdjustments(req.user!.companyId);
  }

  @Post("import/preview")
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  previewImport(@Req() req: AuthenticatedRequest, @Body() dto: ImportInventoryDto) {
    return this.inventory.previewImport(req.user!.companyId, dto);
  }

  @Post("import/commit")
  @RequirePermissions(PERMISSIONS.INVENTORY_EDIT)
  commitImport(@Req() req: AuthenticatedRequest, @Body() dto: ImportInventoryDto) {
    return this.inventory.commitImport(req.user!.companyId, req.user!.id, dto);
  }

  @Post("adjustments")
  @RequirePermissions(PERMISSIONS.INVENTORY_EDIT)
  createStockAdjustment(@Req() req: AuthenticatedRequest, @Body() dto: CreateStockAdjustmentDto) {
    return this.inventory.createStockAdjustment(req.user!.companyId, req.user!.id, dto);
  }

  @Post("opening-stock")
  @RequirePermissions(PERMISSIONS.INVENTORY_EDIT)
  createOpeningStock(@Req() req: AuthenticatedRequest, @Body() dto: CreateOpeningStockDto) {
    return this.inventory.createOpeningStock(req.user!.companyId, req.user!.id, dto);
  }
}
