import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import { CreateRoleDto, UpdateRoleDto } from "./dto/create-role.dto";
import { RolesService } from "./roles.service";

@Controller("roles")
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLE_VIEW)
  list() {
    return this.roles.list();
  }

  @Get("permissions")
  @RequirePermissions(PERMISSIONS.ROLE_VIEW)
  permissions() {
    return this.roles.permissions();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ROLE_CREATE)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateRoleDto) {
    return this.roles.create(req.user!.companyId, req.user!.id, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.ROLE_CREATE)
  update(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(req.user!.companyId, req.user!.id, id, dto);
  }
}
