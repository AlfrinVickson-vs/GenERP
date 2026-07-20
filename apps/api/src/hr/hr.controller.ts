import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import {
  ApprovalDecisionDto,
  CompleteChecklistLineDto,
  CreateAttendanceDto,
  CreateChecklistDto,
  CreateEmployeeDto,
  CreateExpenseClaimDto,
  CreateHolidayDto,
  CreateLeaveRequestDto,
  CreateLeaveTypeDto,
  DelegateApprovalDto
} from "./dto/hr.dto";
import { HrService } from "./hr.service";

@Controller("hr")
export class HrController {
  constructor(private readonly hr: HrService) {}

  @Get("employees")
  @RequirePermissions(PERMISSIONS.HR_VIEW)
  employees(@Req() req: AuthenticatedRequest) {
    return this.hr.employees(req.user!.companyId);
  }

  @Post("employees")
  @RequirePermissions(PERMISSIONS.HR_EDIT)
  createEmployee(@Req() req: AuthenticatedRequest, @Body() dto: CreateEmployeeDto) {
    return this.hr.createEmployee(req.user!.companyId, req.user!.id, dto);
  }

  @Get("leave-types")
  @RequirePermissions(PERMISSIONS.HR_VIEW)
  leaveTypes(@Req() req: AuthenticatedRequest) {
    return this.hr.leaveTypes(req.user!.companyId);
  }

  @Post("leave-types")
  @RequirePermissions(PERMISSIONS.HR_EDIT)
  createLeaveType(@Req() req: AuthenticatedRequest, @Body() dto: CreateLeaveTypeDto) {
    return this.hr.createLeaveType(req.user!.companyId, req.user!.id, dto);
  }

  @Get("holidays")
  @RequirePermissions(PERMISSIONS.HR_VIEW)
  holidays(@Req() req: AuthenticatedRequest) {
    return this.hr.holidays(req.user!.companyId);
  }

  @Post("holidays")
  @RequirePermissions(PERMISSIONS.HR_EDIT)
  createHoliday(@Req() req: AuthenticatedRequest, @Body() dto: CreateHolidayDto) {
    return this.hr.createHoliday(req.user!.companyId, req.user!.id, dto);
  }

  @Get("leave-balances")
  @RequirePermissions(PERMISSIONS.HR_VIEW)
  leaveBalances(@Req() req: AuthenticatedRequest) {
    return this.hr.leaveBalances(req.user!.companyId);
  }

  @Get("certification-alerts")
  @RequirePermissions(PERMISSIONS.HR_VIEW)
  certificationAlerts(@Req() req: AuthenticatedRequest) {
    return this.hr.certificationAlerts(req.user!.companyId);
  }

  @Get("checklists")
  @RequirePermissions(PERMISSIONS.HR_VIEW)
  checklists(@Req() req: AuthenticatedRequest) {
    return this.hr.checklists(req.user!.companyId);
  }

  @Post("checklists")
  @RequirePermissions(PERMISSIONS.HR_EDIT)
  createChecklist(@Req() req: AuthenticatedRequest, @Body() dto: CreateChecklistDto) {
    return this.hr.createChecklist(req.user!.companyId, req.user!.id, dto);
  }

  @Post("checklist-lines/:id/complete")
  @RequirePermissions(PERMISSIONS.HR_EDIT)
  completeChecklistLine(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: CompleteChecklistLineDto) {
    return this.hr.completeChecklistLine(req.user!.companyId, req.user!.id, id, dto);
  }

  @Get("leave-requests")
  @RequirePermissions(PERMISSIONS.HR_VIEW)
  leaveRequests(@Req() req: AuthenticatedRequest) {
    return this.hr.leaveRequests(req.user!.companyId);
  }

  @Post("leave-requests")
  @RequirePermissions(PERMISSIONS.HR_EDIT)
  createLeaveRequest(@Req() req: AuthenticatedRequest, @Body() dto: CreateLeaveRequestDto) {
    return this.hr.createLeaveRequest(req.user!.companyId, req.user!.id, dto);
  }

  @Post("leave-requests/:id/submit")
  @RequirePermissions(PERMISSIONS.HR_EDIT)
  submitLeaveRequest(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.hr.submitLeaveRequest(req.user!.companyId, req.user!.id, id);
  }

  @Get("attendance")
  @RequirePermissions(PERMISSIONS.HR_VIEW)
  attendance(@Req() req: AuthenticatedRequest) {
    return this.hr.attendance(req.user!.companyId);
  }

  @Post("attendance")
  @RequirePermissions(PERMISSIONS.HR_EDIT)
  createAttendance(@Req() req: AuthenticatedRequest, @Body() dto: CreateAttendanceDto) {
    return this.hr.createAttendance(req.user!.companyId, req.user!.id, dto);
  }

  @Get("expense-claims")
  @RequirePermissions(PERMISSIONS.HR_VIEW)
  expenseClaims(@Req() req: AuthenticatedRequest) {
    return this.hr.expenseClaims(req.user!.companyId);
  }

  @Post("expense-claims")
  @RequirePermissions(PERMISSIONS.HR_EDIT)
  createExpenseClaim(@Req() req: AuthenticatedRequest, @Body() dto: CreateExpenseClaimDto) {
    return this.hr.createExpenseClaim(req.user!.companyId, req.user!.id, dto);
  }

  @Post("expense-claims/:id/submit")
  @RequirePermissions(PERMISSIONS.HR_EDIT)
  submitExpenseClaim(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.hr.submitExpenseClaim(req.user!.companyId, req.user!.id, id);
  }

  @Get("approvals")
  @RequirePermissions(PERMISSIONS.APPROVAL_VIEW)
  approvals(@Req() req: AuthenticatedRequest) {
    return this.hr.approvals(req.user!.companyId);
  }

  @Post("approvals/escalate-overdue")
  @RequirePermissions(PERMISSIONS.APPROVAL_ACTION)
  escalateOverdueApprovals(@Req() req: AuthenticatedRequest) {
    return this.hr.escalateOverdueApprovals(req.user!.companyId, req.user!.id);
  }

  @Post("approvals/:id/delegate")
  @RequirePermissions(PERMISSIONS.APPROVAL_ACTION)
  delegate(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: DelegateApprovalDto) {
    return this.hr.delegateApproval(req.user!.companyId, req.user!.id, id, dto);
  }

  @Post("approvals/:id/approve")
  @RequirePermissions(PERMISSIONS.APPROVAL_ACTION)
  approve(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ApprovalDecisionDto) {
    return this.hr.decideApproval(req.user!.companyId, req.user!.id, id, "APPROVE", dto);
  }

  @Post("approvals/:id/reject")
  @RequirePermissions(PERMISSIONS.APPROVAL_ACTION)
  reject(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ApprovalDecisionDto) {
    return this.hr.decideApproval(req.user!.companyId, req.user!.id, id, "REJECT", dto);
  }

  @Post("approvals/:id/return")
  @RequirePermissions(PERMISSIONS.APPROVAL_ACTION)
  returnForCorrection(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ApprovalDecisionDto) {
    return this.hr.decideApproval(req.user!.companyId, req.user!.id, id, "RETURN", dto);
  }

  @Get("notifications")
  @RequirePermissions(PERMISSIONS.NOTIFICATION_VIEW)
  notifications(@Req() req: AuthenticatedRequest) {
    return this.hr.notifications(req.user!.id);
  }

  @Post("notifications/:id/read")
  @RequirePermissions(PERMISSIONS.NOTIFICATION_VIEW)
  markNotificationRead(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.hr.markNotificationRead(req.user!.id, id);
  }
}
