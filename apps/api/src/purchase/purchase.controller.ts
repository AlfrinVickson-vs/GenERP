import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import {
  CreateGoodsReceiptDto,
  CreatePurchaseOrderDto,
  CreatePurchaseRequestDto,
  CreatePurchaseReturnDto,
  CreateRfqDto,
  CreateSupplierInvoiceDto,
  CreateSupplierQuotationDto
} from "./dto/purchase.dto";
import { PurchaseService } from "./purchase.service";

@Controller("purchase")
export class PurchaseController {
  constructor(private readonly purchase: PurchaseService) {}

  @Get("requests")
  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  purchaseRequests(@Req() req: AuthenticatedRequest) {
    return this.purchase.purchaseRequests(req.user!.companyId);
  }

  @Post("requests")
  @RequirePermissions(PERMISSIONS.PURCHASE_EDIT)
  createPurchaseRequest(@Req() req: AuthenticatedRequest, @Body() dto: CreatePurchaseRequestDto) {
    return this.purchase.createPurchaseRequest(req.user!.companyId, req.user!.id, dto);
  }

  @Get("rfqs")
  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  rfqs(@Req() req: AuthenticatedRequest) {
    return this.purchase.rfqs(req.user!.companyId);
  }

  @Post("rfqs")
  @RequirePermissions(PERMISSIONS.PURCHASE_EDIT)
  createRfq(@Req() req: AuthenticatedRequest, @Body() dto: CreateRfqDto) {
    return this.purchase.createRfq(req.user!.companyId, req.user!.id, dto);
  }

  @Get("rfqs/:id/comparison")
  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  compareRfq(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.purchase.compareRfq(req.user!.companyId, id);
  }

  @Get("supplier-quotations")
  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  supplierQuotations(@Req() req: AuthenticatedRequest) {
    return this.purchase.supplierQuotations(req.user!.companyId);
  }

  @Post("supplier-quotations")
  @RequirePermissions(PERMISSIONS.PURCHASE_EDIT)
  createSupplierQuotation(@Req() req: AuthenticatedRequest, @Body() dto: CreateSupplierQuotationDto) {
    return this.purchase.createSupplierQuotation(req.user!.companyId, req.user!.id, dto);
  }

  @Get("orders")
  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  purchaseOrders(@Req() req: AuthenticatedRequest) {
    return this.purchase.purchaseOrders(req.user!.companyId);
  }

  @Post("orders")
  @RequirePermissions(PERMISSIONS.PURCHASE_EDIT)
  createPurchaseOrder(@Req() req: AuthenticatedRequest, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchase.createPurchaseOrder(req.user!.companyId, req.user!.id, dto);
  }

  @Get("receipts")
  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  goodsReceipts(@Req() req: AuthenticatedRequest) {
    return this.purchase.goodsReceipts(req.user!.companyId);
  }

  @Post("receipts")
  @RequirePermissions(PERMISSIONS.PURCHASE_EDIT)
  createGoodsReceipt(@Req() req: AuthenticatedRequest, @Body() dto: CreateGoodsReceiptDto) {
    return this.purchase.createGoodsReceipt(req.user!.companyId, req.user!.id, dto);
  }

  @Get("invoices")
  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  supplierInvoices(@Req() req: AuthenticatedRequest) {
    return this.purchase.supplierInvoices(req.user!.companyId);
  }

  @Post("invoices")
  @RequirePermissions(PERMISSIONS.PURCHASE_EDIT)
  createSupplierInvoice(@Req() req: AuthenticatedRequest, @Body() dto: CreateSupplierInvoiceDto) {
    return this.purchase.createSupplierInvoice(req.user!.companyId, req.user!.id, dto);
  }

  @Get("returns")
  @RequirePermissions(PERMISSIONS.PURCHASE_VIEW)
  purchaseReturns(@Req() req: AuthenticatedRequest) {
    return this.purchase.purchaseReturns(req.user!.companyId);
  }

  @Post("returns")
  @RequirePermissions(PERMISSIONS.PURCHASE_EDIT)
  createPurchaseReturn(@Req() req: AuthenticatedRequest, @Body() dto: CreatePurchaseReturnDto) {
    return this.purchase.createPurchaseReturn(req.user!.companyId, req.user!.id, dto);
  }
}
