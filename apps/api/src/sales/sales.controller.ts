import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import {
  ConvertQuotationDto,
  CreateActivityDto,
  CreateCreditNoteDto,
  CreateDeliveryDto,
  CreateEnquiryDto,
  CreateLeadDto,
  CreateOpportunityDto,
  CreateQuotationDto,
  CreateReceiptDto,
  CreateSalesInvoiceDto,
  CreateSalesOrderDto,
  CreateSalesReturnDto,
  ReviseQuotationDto
} from "./dto/sales.dto";
import { SalesService } from "./sales.service";

@Controller("sales")
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get("leads")
  @RequirePermissions(PERMISSIONS.CRM_VIEW)
  leads(@Req() req: AuthenticatedRequest) {
    return this.sales.leads(req.user!.companyId);
  }

  @Post("leads")
  @RequirePermissions(PERMISSIONS.CRM_EDIT)
  createLead(@Req() req: AuthenticatedRequest, @Body() dto: CreateLeadDto) {
    return this.sales.createLead(req.user!.companyId, req.user!.id, dto);
  }

  @Get("opportunities")
  @RequirePermissions(PERMISSIONS.CRM_VIEW)
  opportunities(@Req() req: AuthenticatedRequest) {
    return this.sales.opportunities(req.user!.companyId);
  }

  @Post("opportunities")
  @RequirePermissions(PERMISSIONS.CRM_EDIT)
  createOpportunity(@Req() req: AuthenticatedRequest, @Body() dto: CreateOpportunityDto) {
    return this.sales.createOpportunity(req.user!.companyId, req.user!.id, dto);
  }

  @Get("quotations")
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  quotations(@Req() req: AuthenticatedRequest) {
    return this.sales.quotations(req.user!.companyId);
  }

  @Post("quotations")
  @RequirePermissions(PERMISSIONS.SALES_EDIT)
  createQuotation(@Req() req: AuthenticatedRequest, @Body() dto: CreateQuotationDto) {
    return this.sales.createQuotation(req.user!.companyId, req.user!.id, dto);
  }

  @Post("quotations/:id/convert-to-order")
  @RequirePermissions(PERMISSIONS.SALES_EDIT)
  convertQuotation(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ConvertQuotationDto) {
    return this.sales.convertQuotationToSalesOrder(req.user!.companyId, req.user!.id, id, dto);
  }

  @Post("quotations/:id/revise")
  @RequirePermissions(PERMISSIONS.SALES_EDIT)
  reviseQuotation(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ReviseQuotationDto) {
    return this.sales.reviseQuotation(req.user!.companyId, req.user!.id, id, dto);
  }

  @Get("orders")
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  salesOrders(@Req() req: AuthenticatedRequest) {
    return this.sales.salesOrders(req.user!.companyId);
  }

  @Post("orders")
  @RequirePermissions(PERMISSIONS.SALES_EDIT)
  createSalesOrder(@Req() req: AuthenticatedRequest, @Body() dto: CreateSalesOrderDto) {
    return this.sales.createSalesOrder(req.user!.companyId, req.user!.id, dto);
  }

  @Get("fulfilment-report")
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  fulfilmentReport(@Req() req: AuthenticatedRequest) {
    return this.sales.fulfilmentReport(req.user!.companyId);
  }

  @Get("deliveries")
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  deliveries(@Req() req: AuthenticatedRequest) {
    return this.sales.deliveries(req.user!.companyId);
  }

  @Post("deliveries")
  @RequirePermissions(PERMISSIONS.SALES_EDIT)
  createDelivery(@Req() req: AuthenticatedRequest, @Body() dto: CreateDeliveryDto) {
    return this.sales.createDelivery(req.user!.companyId, req.user!.id, dto);
  }

  @Get("activities")
  @RequirePermissions(PERMISSIONS.CRM_VIEW)
  activities(@Req() req: AuthenticatedRequest) {
    return this.sales.activities(req.user!.companyId);
  }

  @Get("activities/overdue")
  @RequirePermissions(PERMISSIONS.CRM_VIEW)
  overdueActivities(@Req() req: AuthenticatedRequest) {
    return this.sales.overdueActivities(req.user!.companyId);
  }

  @Post("activities")
  @RequirePermissions(PERMISSIONS.CRM_EDIT)
  createActivity(@Req() req: AuthenticatedRequest, @Body() dto: CreateActivityDto) {
    return this.sales.createActivity(req.user!.companyId, req.user!.id, dto);
  }

  @Post("activities/:id/complete")
  @RequirePermissions(PERMISSIONS.CRM_EDIT)
  completeActivity(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.sales.completeActivity(req.user!.companyId, req.user!.id, id);
  }

  @Get("enquiries")
  @RequirePermissions(PERMISSIONS.CRM_VIEW)
  enquiries(@Req() req: AuthenticatedRequest) {
    return this.sales.enquiries(req.user!.companyId);
  }

  @Post("enquiries")
  @RequirePermissions(PERMISSIONS.CRM_EDIT)
  createEnquiry(@Req() req: AuthenticatedRequest, @Body() dto: CreateEnquiryDto) {
    return this.sales.createEnquiry(req.user!.companyId, req.user!.id, dto);
  }

  @Get("invoices")
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  invoices(@Req() req: AuthenticatedRequest) {
    return this.sales.invoices(req.user!.companyId);
  }

  @Post("invoices")
  @RequirePermissions(PERMISSIONS.SALES_EDIT)
  createInvoice(@Req() req: AuthenticatedRequest, @Body() dto: CreateSalesInvoiceDto) {
    return this.sales.createInvoice(req.user!.companyId, req.user!.id, dto);
  }

  @Get("receipts")
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  receipts(@Req() req: AuthenticatedRequest) {
    return this.sales.receipts(req.user!.companyId);
  }

  @Post("receipts")
  @RequirePermissions(PERMISSIONS.SALES_EDIT)
  createReceipt(@Req() req: AuthenticatedRequest, @Body() dto: CreateReceiptDto) {
    return this.sales.createReceipt(req.user!.companyId, req.user!.id, dto);
  }

  @Get("credit-notes")
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  creditNotes(@Req() req: AuthenticatedRequest) {
    return this.sales.creditNotes(req.user!.companyId);
  }

  @Post("credit-notes")
  @RequirePermissions(PERMISSIONS.SALES_EDIT)
  createCreditNote(@Req() req: AuthenticatedRequest, @Body() dto: CreateCreditNoteDto) {
    return this.sales.createCreditNote(req.user!.companyId, req.user!.id, dto);
  }

  @Get("returns")
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  returns(@Req() req: AuthenticatedRequest) {
    return this.sales.returns(req.user!.companyId);
  }

  @Post("returns")
  @RequirePermissions(PERMISSIONS.SALES_EDIT)
  createReturn(@Req() req: AuthenticatedRequest, @Body() dto: CreateSalesReturnDto) {
    return this.sales.createReturn(req.user!.companyId, req.user!.id, dto);
  }
}
