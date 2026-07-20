import { Body, Controller, Get, Param, Post, Query, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import { EmailReportDto } from "./dto/report-email.dto";
import { CreateReportScheduleDto } from "./dto/report-schedule.dto";
import { ReportsService, type ReportExportFormat, type ReportKind } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("dashboard")
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  dashboard(@Req() req: AuthenticatedRequest) {
    return this.reports.dashboard(req.user!.companyId);
  }

  @Get("operational")
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  operational(@Req() req: AuthenticatedRequest) {
    return this.reports.operational(req.user!.companyId);
  }

  @Get("financial")
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  financial(@Req() req: AuthenticatedRequest) {
    return this.reports.financial(req.user!.companyId);
  }

  @Get("integrations/status")
  @RequirePermissions(PERMISSIONS.INTEGRATION_VIEW)
  integrationStatus() {
    return this.reports.integrationStatus();
  }

  @Get("email-deliveries")
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  emailDeliveries(@Req() req: AuthenticatedRequest) {
    return this.reports.emailDeliveries(req.user!.companyId);
  }

  @Get("schedules")
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  schedules(@Req() req: AuthenticatedRequest) {
    return this.reports.reportSchedules(req.user!.companyId);
  }

  @Post("schedules")
  @RequirePermissions(PERMISSIONS.REPORTS_EXPORT)
  createSchedule(@Req() req: AuthenticatedRequest, @Body() dto: CreateReportScheduleDto) {
    return this.reports.createReportSchedule(req.user!.companyId, req.user!.id, dto);
  }

  @Post("schedules/run-due")
  @RequirePermissions(PERMISSIONS.REPORTS_EXPORT)
  runDueSchedules(@Req() req: AuthenticatedRequest) {
    return this.reports.runDueReportSchedules(req.user!.companyId, req.user!.id);
  }

  @Post("schedules/:id/run")
  @RequirePermissions(PERMISSIONS.REPORTS_EXPORT)
  runSchedule(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.reports.runReportSchedule(req.user!.companyId, req.user!.id, id);
  }

  @Post("email/:kind")
  @RequirePermissions(PERMISSIONS.REPORTS_EXPORT)
  emailReport(@Req() req: AuthenticatedRequest, @Param("kind") kind: ReportKind, @Body() dto: EmailReportDto) {
    return this.reports.queueReportEmail(req.user!.companyId, req.user!.id, kind, dto);
  }

  @Get("integrations/tally-vouchers")
  @RequirePermissions(PERMISSIONS.INTEGRATION_VIEW)
  tallyVouchers(@Req() req: AuthenticatedRequest) {
    return this.reports.tallyVouchers(req.user!.companyId);
  }

  @Get("export/:kind")
  @RequirePermissions(PERMISSIONS.REPORTS_EXPORT)
  async exportReport(
    @Req() req: AuthenticatedRequest,
    @Param("kind") kind: ReportKind,
    @Query("format") format: ReportExportFormat = "csv",
    @Res() response: Response
  ) {
    const exported = await this.reports.exportReport(req.user!.companyId, kind, format);
    response.setHeader("Content-Type", exported.contentType);
    response.setHeader("Content-Length", String(exported.content.length));
    response.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
    response.send(exported.content);
  }
}
