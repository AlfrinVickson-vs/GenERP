import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { PERMISSIONS } from "../common/permissions";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import type { AuthenticatedRequest } from "../common/request-user";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { CreateItemDto } from "./dto/create-item.dto";
import { CreateMasterRecordDto } from "./dto/create-master-record.dto";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { ImportMasterDataDto } from "./dto/import-master-data.dto";
import { UpdateRecordActiveDto, UpdateRecordStatusDto } from "./dto/update-record-state.dto";
import { MasterDataService } from "./master-data.service";

type MasterKind = "customer-categories" | "supplier-categories" | "item-categories" | "units" | "tax-codes" | "currencies" | "payment-terms";

@Controller("master-data")
export class MasterDataController {
  constructor(private readonly masterData: MasterDataService) {}

  @Get("customers")
  @RequirePermissions(PERMISSIONS.CUSTOMER_VIEW)
  customers(@Req() req: AuthenticatedRequest) {
    return this.masterData.customers(req.user!.companyId);
  }

  @Post("customers")
  @RequirePermissions(PERMISSIONS.CUSTOMER_CREATE)
  createCustomer(@Req() req: AuthenticatedRequest, @Body() dto: CreateCustomerDto) {
    return this.masterData.createCustomer(req.user!.companyId, req.user!.id, dto);
  }

  @Patch("customers/:id")
  @RequirePermissions(PERMISSIONS.CUSTOMER_EDIT)
  updateCustomer(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: CreateCustomerDto) {
    return this.masterData.updateCustomer(req.user!.companyId, req.user!.id, id, dto);
  }

  @Patch("customers/:id/status")
  @RequirePermissions(PERMISSIONS.CUSTOMER_EDIT)
  updateCustomerStatus(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: UpdateRecordStatusDto) {
    return this.masterData.updateCustomerStatus(req.user!.companyId, req.user!.id, id, dto.status);
  }

  @Get("suppliers")
  @RequirePermissions(PERMISSIONS.SUPPLIER_VIEW)
  suppliers(@Req() req: AuthenticatedRequest) {
    return this.masterData.suppliers(req.user!.companyId);
  }

  @Post("suppliers")
  @RequirePermissions(PERMISSIONS.SUPPLIER_CREATE)
  createSupplier(@Req() req: AuthenticatedRequest, @Body() dto: CreateSupplierDto) {
    return this.masterData.createSupplier(req.user!.companyId, req.user!.id, dto);
  }

  @Patch("suppliers/:id")
  @RequirePermissions(PERMISSIONS.SUPPLIER_EDIT)
  updateSupplier(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: CreateSupplierDto) {
    return this.masterData.updateSupplier(req.user!.companyId, req.user!.id, id, dto);
  }

  @Patch("suppliers/:id/status")
  @RequirePermissions(PERMISSIONS.SUPPLIER_EDIT)
  updateSupplierStatus(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: UpdateRecordStatusDto) {
    return this.masterData.updateSupplierStatus(req.user!.companyId, req.user!.id, id, dto.status);
  }

  @Get("items")
  @RequirePermissions(PERMISSIONS.ITEM_VIEW)
  items(@Req() req: AuthenticatedRequest) {
    return this.masterData.items(req.user!.companyId);
  }

  @Post("items")
  @RequirePermissions(PERMISSIONS.ITEM_CREATE)
  createItem(@Req() req: AuthenticatedRequest, @Body() dto: CreateItemDto) {
    return this.masterData.createItem(req.user!.companyId, req.user!.id, dto);
  }

  @Patch("items/:id")
  @RequirePermissions(PERMISSIONS.ITEM_EDIT)
  updateItem(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: CreateItemDto) {
    return this.masterData.updateItem(req.user!.companyId, req.user!.id, id, dto);
  }

  @Patch("items/:id/active")
  @RequirePermissions(PERMISSIONS.ITEM_EDIT)
  updateItemActive(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: UpdateRecordActiveDto) {
    return this.masterData.updateItemActive(req.user!.companyId, req.user!.id, id, dto.isActive);
  }

  @Post("import/preview")
  @RequirePermissions(PERMISSIONS.MASTER_DATA_VIEW)
  previewImport(@Req() req: AuthenticatedRequest, @Body() dto: ImportMasterDataDto) {
    return this.masterData.previewImport(req.user!.companyId, dto);
  }

  @Post("import/commit")
  @RequirePermissions(PERMISSIONS.MASTER_DATA_EDIT)
  commitImport(@Req() req: AuthenticatedRequest, @Body() dto: ImportMasterDataDto) {
    return this.masterData.commitImport(req.user!.companyId, req.user!.id, dto);
  }

  @Get("import/jobs")
  @RequirePermissions(PERMISSIONS.MASTER_DATA_VIEW)
  importJobs(@Req() req: AuthenticatedRequest) {
    return this.masterData.listImportJobs(req.user!.companyId);
  }

  @Get("import/jobs/:id")
  @RequirePermissions(PERMISSIONS.MASTER_DATA_VIEW)
  importJob(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.masterData.getImportJob(req.user!.companyId, id);
  }

  @Get(":kind")
  @RequirePermissions(PERMISSIONS.MASTER_DATA_VIEW)
  listMaster(@Req() req: AuthenticatedRequest, @Param("kind") kind: MasterKind) {
    return this.masterData.listMaster(req.user!.companyId, kind);
  }

  @Post(":kind")
  @RequirePermissions(PERMISSIONS.MASTER_DATA_VIEW)
  createMaster(@Req() req: AuthenticatedRequest, @Param("kind") kind: MasterKind, @Body() dto: CreateMasterRecordDto) {
    return this.masterData.createMaster(req.user!.companyId, req.user!.id, kind, dto);
  }

  @Patch(":kind/:id")
  @RequirePermissions(PERMISSIONS.MASTER_DATA_EDIT)
  updateMaster(@Req() req: AuthenticatedRequest, @Param("kind") kind: MasterKind, @Param("id") id: string, @Body() dto: CreateMasterRecordDto) {
    return this.masterData.updateMaster(req.user!.companyId, req.user!.id, kind, id, dto);
  }

  @Patch(":kind/:id/active")
  @RequirePermissions(PERMISSIONS.MASTER_DATA_EDIT)
  updateMasterActive(@Req() req: AuthenticatedRequest, @Param("kind") kind: MasterKind, @Param("id") id: string, @Body() dto: UpdateRecordActiveDto) {
    return this.masterData.updateMasterActive(req.user!.companyId, req.user!.id, kind, id, dto.isActive);
  }
}
