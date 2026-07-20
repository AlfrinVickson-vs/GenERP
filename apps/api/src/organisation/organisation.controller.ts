import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import { CreateOrgUnitDto } from "./dto/create-org-unit.dto";
import { OrganisationService } from "./organisation.service";

@Controller()
export class OrganisationController {
  constructor(private readonly organisation: OrganisationService) {}

  @Get("branches")
  @RequirePermissions(PERMISSIONS.BRANCH_VIEW)
  branches(@Req() req: AuthenticatedRequest) {
    return this.organisation.list(req.user!.companyId, "branch");
  }

  @Post("branches")
  @RequirePermissions(PERMISSIONS.BRANCH_CREATE)
  createBranch(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrgUnitDto) {
    return this.organisation.create(req.user!.companyId, req.user!.id, "branch", dto);
  }

  @Patch("branches/:id")
  @RequirePermissions(PERMISSIONS.BRANCH_EDIT)
  updateBranch(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: CreateOrgUnitDto) {
    return this.organisation.update(req.user!.companyId, req.user!.id, "branch", id, dto);
  }

  @Get("departments")
  @RequirePermissions(PERMISSIONS.DEPARTMENT_VIEW)
  departments(@Req() req: AuthenticatedRequest) {
    return this.organisation.list(req.user!.companyId, "department");
  }

  @Post("departments")
  @RequirePermissions(PERMISSIONS.DEPARTMENT_CREATE)
  createDepartment(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrgUnitDto) {
    return this.organisation.create(req.user!.companyId, req.user!.id, "department", dto);
  }

  @Get("warehouses")
  @RequirePermissions(PERMISSIONS.WAREHOUSE_VIEW)
  warehouses(@Req() req: AuthenticatedRequest) {
    return this.organisation.list(req.user!.companyId, "warehouse");
  }

  @Post("warehouses")
  @RequirePermissions(PERMISSIONS.WAREHOUSE_CREATE)
  createWarehouse(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrgUnitDto) {
    return this.organisation.create(req.user!.companyId, req.user!.id, "warehouse", dto);
  }

  @Get("cost-centers")
  @RequirePermissions(PERMISSIONS.COST_CENTER_VIEW)
  costCenters(@Req() req: AuthenticatedRequest) {
    return this.organisation.list(req.user!.companyId, "costCenter");
  }

  @Post("cost-centers")
  @RequirePermissions(PERMISSIONS.COST_CENTER_CREATE)
  createCostCenter(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrgUnitDto) {
    return this.organisation.create(req.user!.companyId, req.user!.id, "costCenter", dto);
  }
}
