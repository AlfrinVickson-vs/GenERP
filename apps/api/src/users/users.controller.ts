import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USER_VIEW)
  list(@Req() req: AuthenticatedRequest) {
    return this.users.list(req.user!.companyId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USER_CREATE)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateUserDto) {
    return this.users.create(req.user!.companyId, req.user!.id, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.USER_EDIT)
  update(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(req.user!.companyId, req.user!.id, id, dto);
  }
}
