import { Type } from "class-transformer";
import { IsArray, IsIn, IsOptional, IsString, MaxLength, Matches, ValidateNested } from "class-validator";

const MONEY_PATTERN = /^\d+(\.\d{1,4})?$/;

export class CertificationDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;
}

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(24)
  employeeCode!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsString()
  employmentDate!: string;

  @IsOptional()
  @IsString()
  @IsIn(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"])
  employmentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];
}

export class CreateLeaveTypeDto {
  @IsString()
  @MaxLength(24)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(MONEY_PATTERN)
  daysPerYear!: string;
}

export class CreateLeaveRequestDto {
  @IsString()
  employeeId!: string;

  @IsString()
  leaveTypeId!: string;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class CreateAttendanceDto {
  @IsString()
  employeeId!: string;

  @IsString()
  attendanceDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  shiftName?: string;

  @IsOptional()
  @IsString()
  clockIn?: string;

  @IsOptional()
  @IsString()
  clockOut?: string;

  @IsOptional()
  @IsString()
  @IsIn(["PRESENT", "ABSENT", "LATE", "HALF_DAY", "REMOTE"])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class CreateExpenseClaimDto {
  @IsString()
  employeeId!: string;

  @IsString()
  expenseDate!: string;

  @IsString()
  @MaxLength(80)
  category!: string;

  @IsString()
  @Matches(MONEY_PATTERN)
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class ApprovalDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  comments?: string;
}

export class DelegateApprovalDto {
  @IsString()
  delegateToUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  comments?: string;
}

export class CreateHolidayDto {
  @IsString()
  holidayDate!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;
}

export class ChecklistLineDto {
  @IsString()
  @MaxLength(160)
  task!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ownerRole?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class CreateChecklistDto {
  @IsString()
  employeeId!: string;

  @IsString()
  @IsIn(["ONBOARDING", "OFFBOARDING"])
  type!: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistLineDto)
  lines!: ChecklistLineDto[];
}

export class CompleteChecklistLineDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
