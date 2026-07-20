import { Body, Controller, Get, Put, Req } from "@nestjs/common";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import { CompanyService } from "./company.service";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Controller("company")
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  get(@Req() req: AuthenticatedRequest) {
    return this.company.get(req.user!.companyId);
  }

  @Put()
  @RequirePermissions(PERMISSIONS.COMPANY_EDIT)
  update(@Req() req: AuthenticatedRequest, @Body() dto: UpdateCompanyDto) {
    return this.company.update(req.user!.companyId, req.user!.id, dto);
  }
}
