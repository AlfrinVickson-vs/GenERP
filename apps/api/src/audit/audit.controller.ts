import { Controller, Get, Req } from "@nestjs/common";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import type { AuthenticatedRequest } from "../common/request-user";
import { PERMISSIONS } from "../common/permissions";
import { AuditService } from "./audit.service";

@Controller("audit-logs")
@RequirePermissions(PERMISSIONS.AUDIT_VIEW)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.audit.list(req.user!.companyId);
  }
}
