import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import { AccountingService } from "./accounting.service";
import {
  CreateAccountDto,
  CreateBankReconciliationDto,
  CreateBudgetDto,
  CreateFinancialPeriodDto,
  CreateJournalEntryDto,
  CreateOpeningBalanceBatchDto,
  CreateRecurringJournalDto,
  CreateSupplierPaymentDto,
  CreateYearEndCloseDto,
  PostSourceDto
} from "./dto/accounting.dto";

@Controller("accounting")
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  @Get("accounts")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_VIEW)
  accounts(@Req() req: AuthenticatedRequest) {
    return this.accounting.accounts(req.user!.companyId);
  }

  @Get("bank-reconciliations")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_VIEW)
  bankReconciliations(@Req() req: AuthenticatedRequest) {
    return this.accounting.bankReconciliations(req.user!.companyId);
  }

  @Post("bank-reconciliations")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  createBankReconciliation(@Req() req: AuthenticatedRequest, @Body() dto: CreateBankReconciliationDto) {
    return this.accounting.createBankReconciliation(req.user!.companyId, req.user!.id, dto);
  }

  @Get("recurring-journals")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_VIEW)
  recurringJournals(@Req() req: AuthenticatedRequest) {
    return this.accounting.recurringJournals(req.user!.companyId);
  }

  @Post("recurring-journals")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  createRecurringJournal(@Req() req: AuthenticatedRequest, @Body() dto: CreateRecurringJournalDto) {
    return this.accounting.createRecurringJournal(req.user!.companyId, req.user!.id, dto);
  }

  @Post("recurring-journals/:id/run")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  runRecurringJournal(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.accounting.runRecurringJournal(req.user!.companyId, req.user!.id, id);
  }

  @Get("budgets")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_VIEW)
  budgets(@Req() req: AuthenticatedRequest) {
    return this.accounting.budgets(req.user!.companyId);
  }

  @Post("budgets")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  createBudget(@Req() req: AuthenticatedRequest, @Body() dto: CreateBudgetDto) {
    return this.accounting.createBudget(req.user!.companyId, req.user!.id, dto);
  }

  @Get("opening-balances")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_VIEW)
  openingBalances(@Req() req: AuthenticatedRequest) {
    return this.accounting.openingBalances(req.user!.companyId);
  }

  @Post("opening-balances")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  createOpeningBalance(@Req() req: AuthenticatedRequest, @Body() dto: CreateOpeningBalanceBatchDto) {
    return this.accounting.createOpeningBalance(req.user!.companyId, req.user!.id, dto);
  }

  @Post("opening-balances/:id/post")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  postOpeningBalance(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.accounting.postOpeningBalance(req.user!.companyId, req.user!.id, id);
  }

  @Get("year-end-closes")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_VIEW)
  yearEndCloses(@Req() req: AuthenticatedRequest) {
    return this.accounting.yearEndCloses(req.user!.companyId);
  }

  @Post("year-end-closes")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  createYearEndClose(@Req() req: AuthenticatedRequest, @Body() dto: CreateYearEndCloseDto) {
    return this.accounting.createYearEndClose(req.user!.companyId, req.user!.id, dto);
  }

  @Post("accounts")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  createAccount(@Req() req: AuthenticatedRequest, @Body() dto: CreateAccountDto) {
    return this.accounting.createAccount(req.user!.companyId, req.user!.id, dto);
  }

  @Post("defaults")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  ensureDefaults(@Req() req: AuthenticatedRequest) {
    return this.accounting.ensureDefaults(req.user!.companyId, req.user!.id);
  }

  @Get("periods")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_VIEW)
  periods(@Req() req: AuthenticatedRequest) {
    return this.accounting.periods(req.user!.companyId);
  }

  @Post("periods")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  createPeriod(@Req() req: AuthenticatedRequest, @Body() dto: CreateFinancialPeriodDto) {
    return this.accounting.createPeriod(req.user!.companyId, req.user!.id, dto);
  }

  @Post("periods/:id/close")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  closePeriod(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.accounting.closePeriod(req.user!.companyId, req.user!.id, id);
  }

  @Get("journals")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_VIEW)
  journals(@Req() req: AuthenticatedRequest) {
    return this.accounting.journalEntries(req.user!.companyId);
  }

  @Post("journals")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  createJournal(@Req() req: AuthenticatedRequest, @Body() dto: CreateJournalEntryDto) {
    return this.accounting.createJournalEntry(req.user!.companyId, req.user!.id, dto);
  }

  @Post("post-source")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  postSource(@Req() req: AuthenticatedRequest, @Body() dto: PostSourceDto) {
    return this.accounting.postSource(req.user!.companyId, req.user!.id, dto);
  }

  @Get("supplier-payments")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_VIEW)
  supplierPayments(@Req() req: AuthenticatedRequest) {
    return this.accounting.supplierPayments(req.user!.companyId);
  }

  @Post("supplier-payments")
  @RequirePermissions(PERMISSIONS.ACCOUNTING_EDIT)
  createSupplierPayment(@Req() req: AuthenticatedRequest, @Body() dto: CreateSupplierPaymentDto) {
    return this.accounting.createSupplierPayment(req.user!.companyId, req.user!.id, dto);
  }

  @Get("trial-balance")
  @RequirePermissions(PERMISSIONS.FINANCIAL_REPORTS_VIEW)
  trialBalance(@Req() req: AuthenticatedRequest) {
    return this.accounting.trialBalance(req.user!.companyId);
  }

  @Get("ageing")
  @RequirePermissions(PERMISSIONS.FINANCIAL_REPORTS_VIEW)
  ageing(@Req() req: AuthenticatedRequest) {
    return this.accounting.ageing(req.user!.companyId);
  }

  @Get("tax-summary")
  @RequirePermissions(PERMISSIONS.FINANCIAL_REPORTS_VIEW)
  taxSummary(@Req() req: AuthenticatedRequest) {
    return this.accounting.taxSummary(req.user!.companyId);
  }

  @Get("financial-statements")
  @RequirePermissions(PERMISSIONS.FINANCIAL_REPORTS_VIEW)
  financialStatements(@Req() req: AuthenticatedRequest) {
    return this.accounting.financialStatements(req.user!.companyId);
  }
}
