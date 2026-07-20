import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, Matches, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

const MONEY_PATTERN = /^\d+(\.\d{1,4})?$/;

export class CreateAccountDto {
  @IsString()
  @MaxLength(24)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsIn(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"])
  type!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateFinancialPeriodDto {
  @IsString()
  @MaxLength(24)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;
}

export class JournalLineDto {
  @IsString()
  accountId!: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  debit?: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  credit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class CreateJournalEntryDto {
  @IsOptional()
  @IsString()
  entryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

export class PostSourceDto {
  @IsString()
  @IsIn(["SALES_INVOICE", "CUSTOMER_RECEIPT", "SUPPLIER_INVOICE", "SUPPLIER_PAYMENT"])
  sourceType!: string;

  @IsString()
  sourceDocumentId!: string;
}

export class CreateSupplierPaymentDto {
  @IsString()
  supplierInvoiceId!: string;

  @IsString()
  @Matches(MONEY_PATTERN)
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class CreateBankReconciliationDto {
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsString()
  statementDate!: string;

  @IsString()
  @Matches(MONEY_PATTERN)
  statementBalance!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class CreateRecurringJournalDto {
  @IsString()
  @MaxLength(24)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsIn(["MONTHLY", "QUARTERLY", "YEARLY"])
  frequency!: string;

  @IsString()
  nextRunDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

export class BudgetLineDto {
  @IsString()
  accountId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsString()
  @Matches(MONEY_PATTERN)
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class CreateBudgetDto {
  @IsString()
  @MaxLength(24)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  periodId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetLineDto)
  lines!: BudgetLineDto[];
}

export class CreateOpeningBalanceBatchDto {
  @IsString()
  openingDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

export class CreateYearEndCloseDto {
  @IsString()
  periodId!: string;

  @IsOptional()
  @IsString()
  retainedEarningsAccountId?: string;

  @IsOptional()
  @IsString()
  closingDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}
