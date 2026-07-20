import { Controller, Get, Req } from "@nestjs/common";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("summary")
  summary(@Req() req: AuthenticatedRequest) {
    return this.dashboard.summary(req.user!.companyId);
  }
}
