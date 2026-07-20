import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FieldCryptoService } from "../auth/security/field-crypto.service";
import { AuditService } from "../audit/audit.service";
import { hasPermission, PERMISSIONS } from "../common/permissions";
import { PrismaService } from "../prisma/prisma.service";
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

@Injectable()
export class HrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly crypto: FieldCryptoService
  ) {}

  async employees(companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId },
      orderBy: { employeeCode: "asc" },
      include: {
        branch: { select: { code: true, name: true } },
        department: { select: { code: true, name: true } },
        manager: { select: { employeeCode: true, displayName: true } },
        user: { select: { email: true, displayName: true } }
      }
    });
    return employees.map((employee) => this.exposeEmployee(employee));
  }

  leaveTypes(companyId: string) {
    return this.prisma.leaveType.findMany({ where: { companyId }, orderBy: { code: "asc" } });
  }

  leaveRequests(companyId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { employeeCode: true, displayName: true } },
        leaveType: { select: { code: true, name: true } },
        approvalRequest: { include: { steps: { orderBy: { sequence: "asc" } } } }
      }
    });
  }

  attendance(companyId: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { companyId },
      orderBy: { attendanceDate: "desc" },
      take: 100,
      include: { employee: { select: { employeeCode: true, displayName: true } } }
    });
  }

  expenseClaims(companyId: string) {
    return this.prisma.expenseClaim.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { employeeCode: true, displayName: true } },
        approvalRequest: { include: { steps: { orderBy: { sequence: "asc" } } } }
      }
    });
  }

  holidays(companyId: string) {
    return this.prisma.holiday.findMany({ where: { companyId }, orderBy: { holidayDate: "asc" } });
  }

  checklists(companyId: string) {
    return this.prisma.employeeChecklist.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { employeeCode: true, displayName: true } },
        lines: { orderBy: { dueDate: "asc" } }
      }
    });
  }

  async leaveBalances(companyId: string) {
    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`);
    const [employees, leaveTypes, approvedLeave] = await Promise.all([
      this.prisma.employee.findMany({ where: { companyId, status: "ACTIVE" }, orderBy: { employeeCode: "asc" } }),
      this.prisma.leaveType.findMany({ where: { companyId, isActive: true }, orderBy: { code: "asc" } }),
      this.prisma.leaveRequest.findMany({
        where: { companyId, status: "APPROVED", startDate: { gte: yearStart }, endDate: { lte: yearEnd } }
      })
    ]);
    return employees.flatMap((employee) =>
      leaveTypes.map((leaveType) => {
        const used = approvedLeave
          .filter((leave) => leave.employeeId === employee.id && leave.leaveTypeId === leaveType.id)
          .reduce((sum, leave) => sum + Number(leave.days), 0);
        return {
          id: `${employee.id}:${leaveType.id}`,
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          employeeName: employee.displayName,
          leaveType: leaveType.code,
          entitlement: this.decimalText(Number(leaveType.daysPerYear)),
          used: this.decimalText(used),
          balance: this.decimalText(Number(leaveType.daysPerYear) - used)
        };
      })
    );
  }

  async certificationAlerts(companyId: string) {
    const employees = await this.prisma.employee.findMany({ where: { companyId, status: "ACTIVE" }, orderBy: { employeeCode: "asc" } });
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + 60);
    const rows = employees.flatMap((employee) => {
      const certifications = employee.certifications ? JSON.parse(employee.certifications) as Array<{ name: string; expiryDate?: string }> : [];
      return certifications
        .map((certification) => ({ employee, certification, expiryDate: certification.expiryDate ? new Date(certification.expiryDate) : null }))
        .filter((entry) => entry.expiryDate && entry.expiryDate <= threshold)
        .map((entry) => ({
          id: `${entry.employee.id}:${entry.certification.name}`,
          employeeCode: entry.employee.employeeCode,
          employeeName: entry.employee.displayName,
          certification: entry.certification.name,
          expiryDate: entry.expiryDate!.toISOString(),
          status: entry.expiryDate! < now ? "EXPIRED" : "EXPIRING"
        }));
    });

    for (const row of rows) {
      const linkedUser = employees.find((employee) => employee.employeeCode === row.employeeCode)?.userId;
      if (linkedUser) {
        await this.prisma.notification.create({
          data: {
            userId: linkedUser,
            title: "Certification expiry alert",
            body: `${row.certification} is ${row.status.toLowerCase()} for ${row.employeeName}.`
          }
        });
      }
    }
    return rows;
  }

  approvals(companyId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { companyId },
      orderBy: { submittedAt: "desc" },
      include: {
        submittedBy: { select: { displayName: true, email: true } },
        steps: { orderBy: { sequence: "asc" }, include: { approverUser: { select: { displayName: true, email: true } } } },
        actions: { orderBy: { createdAt: "asc" }, include: { actorUser: { select: { displayName: true, email: true } } } }
      }
    });
  }

  notifications(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  }

  async markNotificationRead(userId: string, id: string) {
    return this.prisma.notification.update({ where: { id, userId }, data: { readAt: new Date() } });
  }

  async createEmployee(companyId: string, userId: string, dto: CreateEmployeeDto) {
    if (dto.userId) {
      const linkedUser = await this.prisma.user.findFirst({ where: { id: dto.userId, companyId } });
      if (!linkedUser) throw new BadRequestException("Linked user was not found");
    }
    await this.assertOrgRefs(companyId, dto.branchId, dto.departmentId);
    if (dto.managerId) {
      const manager = await this.prisma.employee.findFirst({ where: { id: dto.managerId, companyId } });
      if (!manager) throw new BadRequestException("Manager was not found");
    }

    const created = await this.prisma.employee.create({
      data: {
        companyId,
        employeeCode: dto.employeeCode.trim().toUpperCase(),
        userId: dto.userId || undefined,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        displayName: `${dto.firstName.trim()} ${dto.lastName.trim()}`,
        email: dto.email?.trim() || undefined,
        phone: dto.phone?.trim() || undefined,
        designation: dto.designation?.trim() || undefined,
        departmentId: dto.departmentId || undefined,
        branchId: dto.branchId || undefined,
        managerId: dto.managerId || undefined,
        employmentDate: this.parseDate(dto.employmentDate, "employmentDate"),
        employmentType: dto.employmentType || "FULL_TIME",
        emergencyContactName: dto.emergencyContactName ? this.crypto.encrypt(dto.emergencyContactName.trim()) : undefined,
        emergencyContactPhone: dto.emergencyContactPhone ? this.crypto.encrypt(dto.emergencyContactPhone.trim()) : undefined,
        skills: dto.skills?.length ? JSON.stringify(dto.skills) : undefined,
        certifications: dto.certifications?.length ? JSON.stringify(dto.certifications) : undefined
      }
    });

    await this.audit.record({ companyId, userId, action: "create_employee", module: "hr", recordType: "Employee", recordId: created.id, afterValue: { employeeCode: created.employeeCode, displayName: created.displayName } });
    return this.exposeEmployee(created);
  }

  async createLeaveType(companyId: string, userId: string, dto: CreateLeaveTypeDto) {
    const created = await this.prisma.leaveType.create({
      data: {
        companyId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        daysPerYear: this.decimalText(this.parseMoney(dto.daysPerYear, "daysPerYear"))
      }
    });
    await this.audit.record({ companyId, userId, action: "create_leave_type", module: "hr", recordType: "LeaveType", recordId: created.id, afterValue: created });
    return created;
  }

  async createHoliday(companyId: string, userId: string, dto: CreateHolidayDto) {
    const created = await this.prisma.holiday.create({
      data: {
        companyId,
        holidayDate: this.parseDate(dto.holidayDate, "holidayDate"),
        name: dto.name.trim(),
        region: dto.region?.trim() || undefined
      }
    });
    await this.audit.record({ companyId, userId, action: "create_holiday", module: "hr", recordType: "Holiday", recordId: created.id, afterValue: created });
    return created;
  }

  async createChecklist(companyId: string, userId: string, dto: CreateChecklistDto) {
    const employee = await this.requireEmployee(companyId, dto.employeeId);
    if (!dto.lines.length) throw new BadRequestException("Checklist needs at least one task");
    const created = await this.prisma.$transaction(async (tx) => {
      const checklistNo = await this.nextChecklistNo(tx, companyId, dto.type);
      return tx.employeeChecklist.create({
        data: {
          companyId,
          employeeId: employee.id,
          checklistNo,
          type: dto.type,
          dueDate: dto.dueDate ? this.parseDate(dto.dueDate, "dueDate") : undefined,
          notes: dto.notes?.trim() || undefined,
          lines: {
            create: dto.lines.map((line) => ({
              task: line.task.trim(),
              ownerRole: line.ownerRole?.trim() || undefined,
              dueDate: line.dueDate ? this.parseDate(line.dueDate, "lineDueDate") : undefined
            }))
          }
        },
        include: { employee: true, lines: true }
      });
    });
    await this.audit.record({ companyId, userId, action: "create_employee_checklist", module: "hr", recordType: "EmployeeChecklist", recordId: created.id, afterValue: { checklistNo: created.checklistNo, employee: employee.employeeCode } });
    return created;
  }

  async completeChecklistLine(companyId: string, userId: string, lineId: string, dto: CompleteChecklistLineDto) {
    const line = await this.prisma.employeeChecklistLine.findFirst({ where: { id: lineId, checklist: { companyId } }, include: { checklist: true } });
    if (!line) throw new BadRequestException("Checklist task was not found");
    const updated = await this.prisma.$transaction(async (tx) => {
      const completed = await tx.employeeChecklistLine.update({
        where: { id: line.id },
        data: { status: "DONE", completedAt: new Date(), notes: dto.notes?.trim() || line.notes }
      });
      const openCount = await tx.employeeChecklistLine.count({ where: { checklistId: line.checklistId, status: { not: "DONE" } } });
      if (openCount === 0) {
        await tx.employeeChecklist.update({ where: { id: line.checklistId }, data: { status: "DONE", completedAt: new Date() } });
      }
      return completed;
    });
    await this.audit.record({ companyId, userId, action: "complete_checklist_task", module: "hr", recordType: "EmployeeChecklistLine", recordId: line.id, afterValue: updated });
    return updated;
  }

  async createLeaveRequest(companyId: string, userId: string, dto: CreateLeaveRequestDto) {
    const employee = await this.requireEmployee(companyId, dto.employeeId);
    const leaveType = await this.prisma.leaveType.findFirst({ where: { id: dto.leaveTypeId, companyId, isActive: true } });
    if (!leaveType) throw new BadRequestException("Leave type was not found");
    const startDate = this.parseDate(dto.startDate, "startDate");
    const endDate = this.parseDate(dto.endDate, "endDate");
    if (endDate < startDate) throw new BadRequestException("endDate must be after startDate");
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

    const created = await this.prisma.leaveRequest.create({
      data: {
        companyId,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        startDate,
        endDate,
        days: this.decimalText(days),
        reason: dto.reason?.trim() || undefined
      },
      include: { employee: true, leaveType: true }
    });
    await this.audit.record({ companyId, userId, action: "create_leave_request", module: "hr", recordType: "LeaveRequest", recordId: created.id, afterValue: { employee: employee.employeeCode, days } });
    return created;
  }

  async submitLeaveRequest(companyId: string, userId: string, id: string) {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: { id, companyId },
      include: { employee: true, leaveType: true }
    });
    if (!leave) throw new BadRequestException("Leave request was not found");
    if (!["DRAFT", "RETURNED"].includes(leave.status)) throw new BadRequestException("Only draft or returned leave requests can be submitted");
    const approval = await this.createApprovalRequest(companyId, userId, {
      documentType: "leave_request",
      documentId: leave.id,
      documentNo: `${leave.employee.employeeCode}-${leave.leaveType.code}`,
      amount: Number(leave.days),
      title: "New leave approval request",
      body: `${leave.employee.displayName} submitted ${leave.days.toString()} day(s) of ${leave.leaveType.name}.`
    });
    const updated = await this.prisma.leaveRequest.update({ where: { id: leave.id }, data: { status: approval.status === "APPROVED" ? "APPROVED" : "PENDING", approvalRequestId: approval.id } });
    await this.audit.record({ companyId, userId, action: "submit_leave_request", module: "approval", recordType: "LeaveRequest", recordId: leave.id, afterValue: { approvalRequestId: approval.id } });
    return updated;
  }

  async createAttendance(companyId: string, userId: string, dto: CreateAttendanceDto) {
    const employee = await this.requireEmployee(companyId, dto.employeeId);
    const created = await this.prisma.attendanceRecord.upsert({
      where: { companyId_employeeId_attendanceDate: { companyId, employeeId: employee.id, attendanceDate: this.parseDate(dto.attendanceDate, "attendanceDate") } },
      update: {
        shiftName: dto.shiftName?.trim() || undefined,
        clockIn: dto.clockIn ? this.parseDate(dto.clockIn, "clockIn") : undefined,
        clockOut: dto.clockOut ? this.parseDate(dto.clockOut, "clockOut") : undefined,
        status: dto.status || "PRESENT",
        notes: dto.notes?.trim() || undefined
      },
      create: {
        companyId,
        employeeId: employee.id,
        attendanceDate: this.parseDate(dto.attendanceDate, "attendanceDate"),
        shiftName: dto.shiftName?.trim() || undefined,
        clockIn: dto.clockIn ? this.parseDate(dto.clockIn, "clockIn") : undefined,
        clockOut: dto.clockOut ? this.parseDate(dto.clockOut, "clockOut") : undefined,
        status: dto.status || "PRESENT",
        notes: dto.notes?.trim() || undefined
      }
    });
    await this.audit.record({ companyId, userId, action: "record_attendance", module: "hr", recordType: "AttendanceRecord", recordId: created.id, afterValue: { employee: employee.employeeCode, status: created.status } });
    return created;
  }

  async createExpenseClaim(companyId: string, userId: string, dto: CreateExpenseClaimDto) {
    const employee = await this.requireEmployee(companyId, dto.employeeId);
    const amount = this.parseMoney(dto.amount, "amount");
    const created = await this.prisma.$transaction(async (tx) => {
      const claimNo = await this.nextClaimNo(tx, companyId);
      return tx.expenseClaim.create({
        data: {
          companyId,
          employeeId: employee.id,
          claimNo,
          expenseDate: this.parseDate(dto.expenseDate, "expenseDate"),
          category: dto.category.trim().toUpperCase(),
          amount: this.decimalText(amount),
          description: dto.description?.trim() || undefined
        },
        include: { employee: true }
      });
    });
    await this.audit.record({ companyId, userId, action: "create_expense_claim", module: "hr", recordType: "ExpenseClaim", recordId: created.id, afterValue: { claimNo: created.claimNo, amount: created.amount } });
    return created;
  }

  async submitExpenseClaim(companyId: string, userId: string, id: string) {
    const claim = await this.prisma.expenseClaim.findFirst({ where: { id, companyId }, include: { employee: true } });
    if (!claim) throw new BadRequestException("Expense claim was not found");
    if (!["DRAFT", "RETURNED"].includes(claim.status)) throw new BadRequestException("Only draft or returned claims can be submitted");
    const approval = await this.createApprovalRequest(companyId, userId, {
      documentType: "expense_claim",
      documentId: claim.id,
      documentNo: claim.claimNo,
      amount: Number(claim.amount),
      title: "New expense claim approval",
      body: `${claim.employee.displayName} submitted ${claim.claimNo} for ${claim.amount.toString()}.`
    });
    const updated = await this.prisma.expenseClaim.update({ where: { id: claim.id }, data: { status: approval.status === "APPROVED" ? "APPROVED" : "PENDING", approvalRequestId: approval.id } });
    await this.audit.record({ companyId, userId, action: "submit_expense_claim", module: "approval", recordType: "ExpenseClaim", recordId: claim.id, afterValue: { approvalRequestId: approval.id } });
    return updated;
  }

  async decideApproval(companyId: string, userId: string, id: string, action: "APPROVE" | "REJECT" | "RETURN", dto: ApprovalDecisionDto) {
    const approval = await this.prisma.approvalRequest.findFirst({
      where: { id, companyId },
      include: { steps: { orderBy: { sequence: "asc" } } }
    });
    if (!approval) throw new BadRequestException("Approval request was not found");
    if (approval.status !== "PENDING") throw new BadRequestException("Approval request is not pending");
    if (approval.submittedById === userId) throw new ForbiddenException("Submitter cannot approve their own document");
    const step = approval.steps.find((entry) => entry.sequence === approval.currentStep && entry.status === "PENDING");
    if (!step) throw new BadRequestException("No pending approval step was found");
    await this.assertApprover(userId, step.approverRole, step.approverUserId);

    const finalStatus = action === "APPROVE" && approval.currentStep >= approval.steps.length ? "APPROVED" : action === "APPROVE" ? "PENDING" : action === "REJECT" ? "REJECTED" : "RETURNED";
    const completedAt = finalStatus === "PENDING" ? undefined : new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.approvalStep.update({
        where: { id: step.id },
        data: {
          status: action === "APPROVE" ? "APPROVED" : finalStatus,
          actedAt: new Date(),
          approverUserId: userId,
          comments: dto.comments?.trim() || undefined
        }
      });
      await tx.approvalAction.create({
        data: {
          approvalRequestId: approval.id,
          stepId: step.id,
          action,
          actorUserId: userId,
          comments: dto.comments?.trim() || undefined
        }
      });
      if (action === "APPROVE" && finalStatus === "PENDING") {
        await tx.approvalStep.updateMany({
          where: { approvalRequestId: approval.id, sequence: approval.currentStep + 1, status: "WAITING" },
          data: { status: "PENDING" }
        });
      }
      const request = await tx.approvalRequest.update({
        where: { id: approval.id },
        data: {
          status: finalStatus,
          currentStep: action === "APPROVE" ? Math.min(approval.currentStep + 1, approval.steps.length) : approval.currentStep,
          completedAt
        },
        include: { steps: { orderBy: { sequence: "asc" } }, actions: { orderBy: { createdAt: "asc" } } }
      });
      await this.applyApprovalStatus(tx, request.documentType, request.documentId, finalStatus);
      return request;
    });

    if (finalStatus === "PENDING") {
      await this.notifyStepApprovers(companyId, approval.steps[approval.currentStep]?.approverRole, "Approval step is ready", `${approval.documentType} ${approval.documentNo ?? approval.documentId} is ready for review.`);
    } else if (approval.submittedById) {
      await this.prisma.notification.create({
        data: {
          userId: approval.submittedById,
          title: `Approval ${finalStatus.toLowerCase()}`,
          body: `${approval.documentType} ${approval.documentNo ?? approval.documentId} was ${finalStatus.toLowerCase()}.`
        }
      });
    }

    await this.audit.record({ companyId, userId, action: `approval_${action.toLowerCase()}`, module: "approval", recordType: "ApprovalRequest", recordId: approval.id, afterValue: { status: finalStatus } });
    return updated;
  }

  async delegateApproval(companyId: string, userId: string, id: string, dto: DelegateApprovalDto) {
    const approval = await this.prisma.approvalRequest.findFirst({
      where: { id, companyId },
      include: { steps: { orderBy: { sequence: "asc" } } }
    });
    if (!approval) throw new BadRequestException("Approval request was not found");
    if (approval.status !== "PENDING") throw new BadRequestException("Only pending approvals can be delegated");
    const step = approval.steps.find((entry) => entry.sequence === approval.currentStep && entry.status === "PENDING");
    if (!step) throw new BadRequestException("No pending approval step was found");
    await this.assertApprover(userId, step.approverRole, step.approverUserId);
    const delegate = await this.prisma.user.findFirst({ where: { id: dto.delegateToUserId, companyId, status: "ACTIVE" } });
    if (!delegate) throw new BadRequestException("Delegate user was not found");

    const updated = await this.prisma.$transaction(async (tx) => {
      const delegated = await tx.approvalStep.update({
        where: { id: step.id },
        data: { approverUserId: delegate.id, comments: dto.comments?.trim() || undefined }
      });
      await tx.approvalAction.create({
        data: {
          approvalRequestId: approval.id,
          stepId: step.id,
          action: "DELEGATE",
          actorUserId: userId,
          comments: dto.comments?.trim() || `Delegated to ${delegate.displayName}`
        }
      });
      return delegated;
    });
    await this.prisma.notification.create({
      data: {
        userId: delegate.id,
        title: "Approval delegated to you",
        body: `${approval.documentType} ${approval.documentNo ?? approval.documentId} was delegated to you.`
      }
    });
    await this.audit.record({ companyId, userId, action: "delegate_approval", module: "approval", recordType: "ApprovalRequest", recordId: approval.id, afterValue: { delegateToUserId: delegate.id } });
    return updated;
  }

  async escalateOverdueApprovals(companyId: string, userId: string) {
    const now = new Date();
    const overdue = await this.prisma.approvalStep.findMany({
      where: { status: "PENDING", dueAt: { lt: now }, approvalRequest: { companyId, status: "PENDING" } },
      include: { approvalRequest: true }
    });
    for (const step of overdue) {
      await this.prisma.approvalAction.create({
        data: {
          approvalRequestId: step.approvalRequestId,
          stepId: step.id,
          action: "ESCALATE",
          actorUserId: userId,
          comments: "Overdue approval escalated"
        }
      });
      await this.notifyUsersWithPermission(companyId, PERMISSIONS.APPROVAL_ACTION, "Overdue approval escalated", `${step.approvalRequest.documentType} ${step.approvalRequest.documentNo ?? step.approvalRequest.documentId} is overdue.`);
    }
    await this.audit.record({ companyId, userId, action: "escalate_overdue_approvals", module: "approval", recordType: "ApprovalRequest", afterValue: { escalated: overdue.length } });
    return { escalated: overdue.length };
  }

  private async createApprovalRequest(
    companyId: string,
    userId: string,
    params: { documentType: string; documentId: string; documentNo?: string; amount?: number; title: string; body: string }
  ) {
    const existing = await this.prisma.approvalRequest.findUnique({
      where: { companyId_documentType_documentId: { companyId, documentType: params.documentType, documentId: params.documentId } }
    });
    if (existing) throw new BadRequestException("Document has already been submitted for approval");
    const rules = await this.approvalRules(params.documentType, params.amount ?? 0);
    const status = rules.length ? "PENDING" : "APPROVED";
    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.approvalRequest.create({
        data: {
          companyId,
          documentType: params.documentType,
          documentId: params.documentId,
          documentNo: params.documentNo,
          amount: params.amount == null ? undefined : this.decimalText(params.amount),
          status,
          submittedById: userId,
          completedAt: status === "APPROVED" ? new Date() : undefined,
          steps: {
            create: rules.map((rule) => ({
              sequence: rule.sequence,
              approverRole: rule.approverRole,
              status: rule.sequence === 1 ? "PENDING" : "WAITING",
              dueAt: this.daysFromNow(rule.sequence * 3)
            }))
          },
          actions: { create: [{ action: "SUBMIT", actorUserId: userId, comments: "Submitted for approval" }] }
        },
        include: { steps: { orderBy: { sequence: "asc" } }, actions: true }
      });
      return created;
    });

    if (request.status === "PENDING") {
      await this.notifyStepApprovers(companyId, rules[0].approverRole, params.title, params.body);
    }
    return request;
  }

  private async approvalRules(documentType: string, amount: number) {
    const configured = await this.prisma.approvalRule.findMany({
      where: {
        documentType,
        isActive: true,
        AND: [
          { OR: [{ minAmount: null }, { minAmount: { lte: this.decimalText(amount) } }] },
          { OR: [{ maxAmount: null }, { maxAmount: { gte: this.decimalText(amount) } }] }
        ]
      },
      orderBy: { sequence: "asc" }
    });
    if (configured.length) return configured;
    if (documentType === "expense_claim") return [{ sequence: 1, approverRole: "Department Manager" }, { sequence: 2, approverRole: "Finance Manager" }];
    if (documentType === "leave_request") return [{ sequence: 1, approverRole: "HR Manager" }];
    return [];
  }

  private async notifyStepApprovers(companyId: string, roleName: string, title: string, body: string) {
    const approvers = await this.prisma.user.findMany({
      where: { companyId, status: "ACTIVE", roles: { some: { role: { name: roleName } } } },
      select: { id: true }
    });
    if (!approvers.length) return;
    await this.prisma.notification.createMany({ data: approvers.map((user) => ({ userId: user.id, title, body })) });
  }

  private async notifyUsersWithPermission(companyId: string, permission: string, title: string, body: string) {
    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        status: "ACTIVE",
        roles: { some: { role: { permissions: { some: { permission: { code: permission } } } } } }
      },
      select: { id: true }
    });
    if (!users.length) return;
    await this.prisma.notification.createMany({ data: users.map((user) => ({ userId: user.id, title, body })) });
  }

  private async assertApprover(userId: string, roleName: string, approverUserId?: string | null) {
    if (approverUserId === userId) return;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!user) throw new ForbiddenException("Approver was not found");
    const roleNames = user.roles.map((entry) => entry.role.name);
    const permissions = user.roles.flatMap((entry) => entry.role.permissions.map((permission) => permission.permission.code));
    if (!roleNames.includes("System Administrator") && !roleNames.includes(roleName) && !hasPermission(permissions, PERMISSIONS.APPROVAL_ACTION)) {
      throw new ForbiddenException(`Only ${roleName} can action this approval step`);
    }
  }

  private async applyApprovalStatus(tx: Prisma.TransactionClient, documentType: string, documentId: string, status: string) {
    if (documentType === "leave_request") await tx.leaveRequest.update({ where: { id: documentId }, data: { status } });
    if (documentType === "expense_claim") await tx.expenseClaim.update({ where: { id: documentId }, data: { status } });
  }

  private async requireEmployee(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new BadRequestException("Employee was not found");
    return employee;
  }

  private async assertOrgRefs(companyId: string, branchId?: string, departmentId?: string) {
    if (branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: branchId, companyId } });
      if (!branch) throw new BadRequestException("Branch was not found");
    }
    if (departmentId) {
      const department = await this.prisma.department.findFirst({ where: { id: departmentId, companyId } });
      if (!department) throw new BadRequestException("Department was not found");
    }
  }

  private async nextClaimNo(tx: Prisma.TransactionClient, companyId: string) {
    const count = await tx.expenseClaim.count({ where: { companyId } });
    return `EXP-${String(count + 1).padStart(5, "0")}`;
  }

  private async nextChecklistNo(tx: Prisma.TransactionClient, companyId: string, type: string) {
    const prefix = type === "OFFBOARDING" ? "OFF" : "ONB";
    const count = await tx.employeeChecklist.count({ where: { companyId, type } });
    return `${prefix}-${String(count + 1).padStart(5, "0")}`;
  }

  private exposeEmployee<T extends { emergencyContactName?: string | null; emergencyContactPhone?: string | null; skills?: string | null; certifications?: string | null }>(employee: T) {
    return {
      ...employee,
      emergencyContactName: employee.emergencyContactName ? this.safeDecrypt(employee.emergencyContactName) : null,
      emergencyContactPhone: employee.emergencyContactPhone ? this.safeDecrypt(employee.emergencyContactPhone) : null,
      skills: employee.skills ? JSON.parse(employee.skills) : [],
      certifications: employee.certifications ? JSON.parse(employee.certifications) : []
    };
  }

  private safeDecrypt(value: string) {
    try {
      return this.crypto.decrypt(value);
    } catch {
      return "";
    }
  }

  private parseDate(value: string, field: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException(`${field} must be a valid date`);
    return parsed;
  }

  private parseMoney(value: string, field: string) {
    if (!/^\d+(\.\d{1,4})?$/.test(String(value).trim())) throw new BadRequestException(`${field} must be a non-negative number with up to 4 decimals`);
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) throw new BadRequestException(`${field} must be a non-negative number`);
    return parsed;
  }

  private decimalText(value: number) {
    return value.toFixed(4).replace(/\.?0+$/, "");
  }

  private daysFromNow(days: number) {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + days);
    return dueAt;
  }
}
