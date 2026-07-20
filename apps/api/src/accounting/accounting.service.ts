import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
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

type AccountSeed = {
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  isControl?: boolean;
  isCash?: boolean;
};

const DEFAULT_ACCOUNTS: AccountSeed[] = [
  { code: "1000", name: "Bank", type: "ASSET", isCash: true },
  { code: "1100", name: "Accounts Receivable", type: "ASSET", isControl: true },
  { code: "1200", name: "Inventory", type: "ASSET", isControl: true },
  { code: "1300", name: "Input Tax", type: "ASSET" },
  { code: "2000", name: "Accounts Payable", type: "LIABILITY", isControl: true },
  { code: "2100", name: "Output Tax", type: "LIABILITY" },
  { code: "3000", name: "Owner Equity", type: "EQUITY" },
  { code: "4000", name: "Sales Revenue", type: "REVENUE" },
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
  { code: "5100", name: "Purchases Expense", type: "EXPENSE" },
  { code: "5200", name: "Inventory Adjustment", type: "EXPENSE" }
];

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  accounts(companyId: string) {
    return this.prisma.account.findMany({ where: { companyId }, orderBy: { code: "asc" } });
  }

  periods(companyId: string) {
    return this.prisma.financialPeriod.findMany({ where: { companyId }, orderBy: { startDate: "desc" } });
  }

  journalEntries(companyId: string) {
    return this.prisma.journalEntry.findMany({
      where: { companyId },
      orderBy: { entryDate: "desc" },
      take: 100,
      include: {
        lines: { include: { account: { select: { code: true, name: true, type: true } } }, orderBy: { account: { code: "asc" } } },
        postedBy: { select: { displayName: true, email: true } }
      }
    });
  }

  supplierPayments(companyId: string) {
    return this.prisma.supplierPayment.findMany({
      where: { companyId },
      orderBy: { paymentDate: "desc" },
      include: {
        supplier: { select: { code: true, name: true } },
        supplierInvoice: { select: { invoiceNo: true, supplierInvoiceNo: true, total: true, paidAmount: true, status: true } }
      }
    });
  }

  bankReconciliations(companyId: string) {
    return this.prisma.bankReconciliation.findMany({
      where: { companyId },
      orderBy: { statementDate: "desc" },
      take: 50,
      include: {
        bankAccount: { select: { code: true, name: true } },
        lines: { include: { journalEntry: { select: { journalNo: true, sourceType: true, memo: true, entryDate: true } } } }
      }
    });
  }

  recurringJournals(companyId: string) {
    return this.prisma.recurringJournal.findMany({
      where: { companyId },
      orderBy: [{ status: "asc" }, { nextRunDate: "asc" }],
      include: { lines: { include: { account: { select: { code: true, name: true, type: true } } } }, createdBy: { select: { displayName: true } } }
    });
  }

  budgets(companyId: string) {
    return this.prisma.budget.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        period: { select: { code: true, name: true, status: true } },
        lines: { include: { account: { select: { code: true, name: true, type: true } } } }
      }
    });
  }

  openingBalances(companyId: string) {
    return this.prisma.openingBalanceBatch.findMany({
      where: { companyId },
      orderBy: { openingDate: "desc" },
      include: {
        journalEntry: { select: { journalNo: true } },
        lines: { include: { account: { select: { code: true, name: true, type: true } } } }
      }
    });
  }

  yearEndCloses(companyId: string) {
    return this.prisma.yearEndClose.findMany({
      where: { companyId },
      orderBy: { closingDate: "desc" },
      include: {
        period: { select: { code: true, name: true, status: true } },
        retainedEarningsAccount: { select: { code: true, name: true } },
        journalEntry: { select: { journalNo: true } }
      }
    });
  }

  async ensureDefaults(companyId: string, userId: string) {
    const accounts = [];
    for (const seed of DEFAULT_ACCOUNTS) {
      accounts.push(
        await this.prisma.account.upsert({
          where: { companyId_code: { companyId, code: seed.code } },
          update: {
            name: seed.name,
            type: seed.type,
            normalBalance: this.normalBalance(seed.type),
            isControl: Boolean(seed.isControl),
            isCash: Boolean(seed.isCash),
            isActive: true
          },
          create: {
            companyId,
            code: seed.code,
            name: seed.name,
            type: seed.type,
            normalBalance: this.normalBalance(seed.type),
            isControl: Boolean(seed.isControl),
            isCash: Boolean(seed.isCash)
          }
        })
      );
    }

    const currentYear = new Date().getFullYear();
    const period = await this.prisma.financialPeriod.upsert({
      where: { companyId_code: { companyId, code: String(currentYear) } },
      update: { status: "OPEN" },
      create: {
        companyId,
        code: String(currentYear),
        name: `${currentYear} Financial Year`,
        startDate: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        endDate: new Date(`${currentYear}-12-31T23:59:59.999Z`)
      }
    });

    await this.audit.record({
      companyId,
      userId,
      action: "ensure_accounting_defaults",
      module: "accounting",
      recordType: "Account",
      afterValue: { accounts: accounts.length, period: period.code }
    });

    return { accounts, period };
  }

  async createAccount(companyId: string, userId: string, dto: CreateAccountDto) {
    const code = dto.code.trim().toUpperCase();
    const type = dto.type.trim().toUpperCase();
    if (!["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].includes(type)) throw new BadRequestException("Invalid account type");

    const created = await this.prisma.account.create({
      data: {
        companyId,
        code,
        name: dto.name.trim(),
        type,
        normalBalance: this.normalBalance(type),
        parentId: dto.parentId || undefined
      }
    });

    await this.audit.record({ companyId, userId, action: "create_account", module: "accounting", recordType: "Account", recordId: created.id, afterValue: created });
    return created;
  }

  async createPeriod(companyId: string, userId: string, dto: CreateFinancialPeriodDto) {
    const startDate = this.parseDate(dto.startDate, "startDate");
    const endDate = this.parseDate(dto.endDate, "endDate");
    if (endDate < startDate) throw new BadRequestException("endDate must be after startDate");

    const created = await this.prisma.financialPeriod.create({
      data: {
        companyId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        startDate,
        endDate
      }
    });

    await this.audit.record({ companyId, userId, action: "create_financial_period", module: "accounting", recordType: "FinancialPeriod", recordId: created.id, afterValue: created });
    return created;
  }

  async closePeriod(companyId: string, userId: string, id: string) {
    const closed = await this.prisma.financialPeriod.update({ where: { id, companyId }, data: { status: "CLOSED" } });
    await this.audit.record({ companyId, userId, action: "close_period", module: "accounting", recordType: "FinancialPeriod", recordId: closed.id, afterValue: closed });
    return closed;
  }

  async createJournalEntry(companyId: string, userId: string, dto: CreateJournalEntryDto) {
    await this.ensureDefaults(companyId, userId);
    const entryDate = dto.entryDate ? this.parseDate(dto.entryDate, "entryDate") : new Date();
    return this.postJournal(companyId, userId, {
      entryDate,
      sourceType: "MANUAL",
      memo: dto.memo?.trim() || "Manual journal",
      lines: dto.lines.map((line) => ({
        accountId: line.accountId,
        debit: this.parseMoney(line.debit ?? "0", "debit"),
        credit: this.parseMoney(line.credit ?? "0", "credit"),
        description: line.description?.trim() || undefined
      }))
    });
  }

  async createSupplierPayment(companyId: string, userId: string, dto: CreateSupplierPaymentDto) {
    await this.ensureDefaults(companyId, userId);
    const amount = this.parseMoney(dto.amount, "amount");
    const invoice = await this.prisma.supplierInvoice.findFirst({
      where: { id: dto.supplierInvoiceId, companyId },
      include: { supplier: { select: { id: true, code: true, name: true } } }
    });
    if (!invoice) throw new BadRequestException("Supplier invoice was not found");
    const outstanding = Number(invoice.total) - Number(invoice.paidAmount);
    if (amount <= 0 || amount > outstanding) throw new BadRequestException("Payment amount exceeds supplier invoice outstanding amount");

    const payment = await this.prisma.$transaction(async (tx) => {
      const paymentNo = await this.nextDocumentNo(tx, companyId, "supplierPayment", "SPAY");
      const created = await tx.supplierPayment.create({
        data: {
          companyId,
          paymentNo,
          supplierId: invoice.supplierId,
          supplierInvoiceId: invoice.id,
          amount: this.decimalText(amount),
          method: dto.method?.trim().toUpperCase() || "BANK",
          reference: dto.reference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          postedById: userId
        },
        include: { supplier: { select: { code: true, name: true } }, supplierInvoice: { select: { invoiceNo: true } } }
      });

      const paidAmount = Number(invoice.paidAmount) + amount;
      await tx.supplierInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: this.decimalText(paidAmount),
          status: paidAmount >= Number(invoice.total) ? "PAID" : "PARTIALLY_PAID"
        }
      });
      return created;
    });

    await this.postSource(companyId, userId, { sourceType: "SUPPLIER_PAYMENT", sourceDocumentId: payment.id });
    await this.audit.record({ companyId, userId, action: "supplier_payment", module: "accounting", recordType: "SupplierPayment", recordId: payment.id, afterValue: payment });
    return payment;
  }

  async postSource(companyId: string, userId: string, dto: PostSourceDto) {
    await this.ensureDefaults(companyId, userId);
    const existing = await this.prisma.journalEntry.findUnique({
      where: { companyId_sourceType_sourceDocumentId: { companyId, sourceType: dto.sourceType, sourceDocumentId: dto.sourceDocumentId } }
    });
    if (existing) throw new ConflictException("Source document has already been posted to the general ledger");

    if (dto.sourceType === "SALES_INVOICE") return this.postSalesInvoice(companyId, userId, dto.sourceDocumentId);
    if (dto.sourceType === "CUSTOMER_RECEIPT") return this.postCustomerReceipt(companyId, userId, dto.sourceDocumentId);
    if (dto.sourceType === "SUPPLIER_INVOICE") return this.postSupplierInvoice(companyId, userId, dto.sourceDocumentId);
    if (dto.sourceType === "SUPPLIER_PAYMENT") return this.postSupplierPayment(companyId, userId, dto.sourceDocumentId);
    throw new BadRequestException("Unsupported source type");
  }

  async trialBalance(companyId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { companyId },
      orderBy: { code: "asc" },
      include: { journalLines: true }
    });

    const rows = accounts.map((account) => {
      const debit = account.journalLines.reduce((sum, line) => sum + Number(line.debit), 0);
      const credit = account.journalLines.reduce((sum, line) => sum + Number(line.credit), 0);
      return {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit: this.decimalText(debit),
        credit: this.decimalText(credit),
        balance: this.decimalText(account.normalBalance === "DEBIT" ? debit - credit : credit - debit)
      };
    });

    return {
      totalDebit: this.decimalText(rows.reduce((sum, row) => sum + Number(row.debit), 0)),
      totalCredit: this.decimalText(rows.reduce((sum, row) => sum + Number(row.credit), 0)),
      rows
    };
  }

  async ageing(companyId: string) {
    const [salesInvoices, supplierInvoices] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: { companyId },
        include: { customer: { select: { code: true, name: true } } },
        orderBy: { invoiceDate: "desc" }
      }),
      this.prisma.supplierInvoice.findMany({
        where: { companyId },
        include: { supplier: { select: { code: true, name: true } } },
        orderBy: { invoiceDate: "desc" }
      })
    ]);
    const today = new Date();
    const bucket = (date: Date) => {
      const days = Math.max(0, Math.floor((today.getTime() - date.getTime()) / 86400000));
      if (days <= 30) return "current";
      if (days <= 60) return "31-60";
      if (days <= 90) return "61-90";
      return "90+";
    };

    return {
      receivables: salesInvoices
        .map((invoice) => ({
          id: invoice.id,
          documentNo: invoice.invoiceNo,
          party: invoice.customer.code,
          bucket: bucket(invoice.dueDate ?? invoice.invoiceDate),
          outstanding: this.decimalText(Number(invoice.total) - Number(invoice.paidAmount)),
          status: invoice.status
        }))
        .filter((row) => Number(row.outstanding) > 0),
      payables: supplierInvoices
        .map((invoice) => ({
          id: invoice.id,
          documentNo: invoice.invoiceNo,
          supplierInvoiceNo: invoice.supplierInvoiceNo,
          party: invoice.supplier.code,
          bucket: bucket(invoice.invoiceDate),
          outstanding: this.decimalText(Number(invoice.total) - Number(invoice.paidAmount)),
          status: invoice.status
        }))
        .filter((row) => Number(row.outstanding) > 0)
    };
  }

  async createBankReconciliation(companyId: string, userId: string, dto: CreateBankReconciliationDto) {
    await this.ensureDefaults(companyId, userId);
    const bankAccount = dto.bankAccountId
      ? await this.prisma.account.findFirst({ where: { id: dto.bankAccountId, companyId, isCash: true, isActive: true } })
      : await this.prisma.account.findFirst({ where: { companyId, code: "1000", isActive: true } });
    if (!bankAccount) throw new BadRequestException("Bank account was not found");
    const statementDate = this.parseDate(dto.statementDate, "statementDate");
    const statementBalance = this.parseMoney(dto.statementBalance, "statementBalance");

    const allBankLines = await this.prisma.journalLine.findMany({
      where: {
        companyId,
        accountId: bankAccount.id,
        journalEntry: { entryDate: { lte: statementDate }, status: "POSTED" }
      },
      include: { journalEntry: { select: { entryDate: true, journalNo: true } } }
    });
    const unreconciledLines = allBankLines.filter((line) => !line.bankReconciledAt);
    const bookBalance = allBankLines.reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0);
    const reconciledAmount = unreconciledLines.reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0);
    const difference = statementBalance - bookBalance;

    const reconciliation = await this.prisma.$transaction(async (tx) => {
      const reconciliationNo = await this.nextAccountingDocumentNo(tx, companyId, "bankReconciliation", "BR");
      const created = await tx.bankReconciliation.create({
        data: {
          companyId,
          reconciliationNo,
          bankAccountId: bankAccount.id,
          statementDate,
          statementBalance: this.decimalText(statementBalance),
          bookBalance: this.decimalText(bookBalance),
          reconciledAmount: this.decimalText(reconciledAmount),
          difference: this.decimalText(difference),
          status: Math.abs(difference) < 0.0001 ? "BALANCED" : "OUT_OF_BALANCE",
          notes: dto.notes?.trim() || undefined,
          createdById: userId
        }
      });

      if (unreconciledLines.length) {
        await tx.journalLine.updateMany({
          where: { id: { in: unreconciledLines.map((line) => line.id) } },
          data: { bankReconciliationId: created.id, bankReconciledAt: new Date() }
        });
      }

      return tx.bankReconciliation.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          bankAccount: { select: { code: true, name: true } },
          lines: { include: { journalEntry: { select: { journalNo: true, sourceType: true, memo: true, entryDate: true } } } }
        }
      });
    });

    await this.audit.record({ companyId, userId, action: "bank_reconciliation", module: "accounting", recordType: "BankReconciliation", recordId: reconciliation.id, afterValue: reconciliation });
    return reconciliation;
  }

  async createRecurringJournal(companyId: string, userId: string, dto: CreateRecurringJournalDto) {
    await this.ensureDefaults(companyId, userId);
    const lines = this.normalizeJournalLines(dto.lines);
    await this.validateJournalLines(companyId, lines);
    const created = await this.prisma.recurringJournal.create({
      data: {
        companyId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        frequency: dto.frequency,
        nextRunDate: this.parseDate(dto.nextRunDate, "nextRunDate"),
        memo: dto.memo?.trim() || undefined,
        createdById: userId,
        lines: {
          create: lines.map((line) => ({
            accountId: line.accountId,
            debit: this.decimalText(line.debit),
            credit: this.decimalText(line.credit),
            description: line.description
          }))
        }
      },
      include: { lines: { include: { account: true } } }
    });

    await this.audit.record({ companyId, userId, action: "create_recurring_journal", module: "accounting", recordType: "RecurringJournal", recordId: created.id, afterValue: created });
    return created;
  }

  async runRecurringJournal(companyId: string, userId: string, id: string) {
    await this.ensureDefaults(companyId, userId);
    const recurring = await this.prisma.recurringJournal.findFirst({
      where: { id, companyId },
      include: { lines: true }
    });
    if (!recurring) throw new BadRequestException("Recurring journal was not found");
    if (recurring.status !== "ACTIVE") throw new BadRequestException("Recurring journal is not active");

    const journal = await this.postJournal(companyId, userId, {
      entryDate: recurring.nextRunDate,
      sourceType: "RECURRING_JOURNAL",
      sourceDocumentId: `${recurring.id}:${recurring.nextRunDate.toISOString()}`,
      memo: recurring.memo || `Recurring journal ${recurring.code}`,
      lines: recurring.lines.map((line) => ({
        accountId: line.accountId,
        debit: Number(line.debit),
        credit: Number(line.credit),
        description: line.description || recurring.name
      }))
    });

    const updated = await this.prisma.recurringJournal.update({
      where: { id: recurring.id },
      data: { nextRunDate: this.nextRecurringDate(recurring.nextRunDate, recurring.frequency) },
      include: { lines: { include: { account: true } } }
    });
    await this.audit.record({ companyId, userId, action: "run_recurring_journal", module: "accounting", recordType: "RecurringJournal", recordId: recurring.id, afterValue: { journalNo: journal.journalNo, nextRunDate: updated.nextRunDate } });
    return { recurringJournal: updated, journalEntry: journal };
  }

  async createBudget(companyId: string, userId: string, dto: CreateBudgetDto) {
    await this.ensureDefaults(companyId, userId);
    if (!dto.lines.length) throw new BadRequestException("Budget needs at least one line");
    if (dto.periodId) {
      const period = await this.prisma.financialPeriod.findFirst({ where: { id: dto.periodId, companyId } });
      if (!period) throw new BadRequestException("Budget period was not found");
    }
    const accountIds = new Set(dto.lines.map((line) => line.accountId));
    const accounts = await this.prisma.account.findMany({ where: { companyId, id: { in: [...accountIds] }, isActive: true } });
    if (accounts.length !== accountIds.size) throw new BadRequestException("One or more budget accounts are invalid");

    const created = await this.prisma.budget.create({
      data: {
        companyId,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        periodId: dto.periodId || undefined,
        createdById: userId,
        lines: {
          create: dto.lines.map((line) => ({
            accountId: line.accountId,
            month: line.month,
            amount: this.decimalText(this.parseMoney(line.amount, "amount")),
            notes: line.notes?.trim() || undefined
          }))
        }
      },
      include: { period: true, lines: { include: { account: true } } }
    });

    await this.audit.record({ companyId, userId, action: "create_budget", module: "accounting", recordType: "Budget", recordId: created.id, afterValue: created });
    return created;
  }

  async createOpeningBalance(companyId: string, userId: string, dto: CreateOpeningBalanceBatchDto) {
    await this.ensureDefaults(companyId, userId);
    const lines = this.normalizeJournalLines(dto.lines);
    await this.validateJournalLines(companyId, lines);
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    const created = await this.prisma.$transaction(async (tx) => {
      const batchNo = await this.nextAccountingDocumentNo(tx, companyId, "openingBalanceBatch", "OB");
      return tx.openingBalanceBatch.create({
        data: {
          companyId,
          batchNo,
          openingDate: this.parseDate(dto.openingDate, "openingDate"),
          totalDebit: this.decimalText(totalDebit),
          totalCredit: this.decimalText(totalCredit),
          notes: dto.notes?.trim() || undefined,
          createdById: userId,
          lines: {
            create: lines.map((line) => ({
              accountId: line.accountId,
              debit: this.decimalText(line.debit),
              credit: this.decimalText(line.credit),
              description: line.description
            }))
          }
        },
        include: { lines: { include: { account: true } } }
      });
    });

    await this.audit.record({ companyId, userId, action: "create_opening_balance", module: "accounting", recordType: "OpeningBalanceBatch", recordId: created.id, afterValue: created });
    return created;
  }

  async postOpeningBalance(companyId: string, userId: string, id: string) {
    await this.ensureDefaults(companyId, userId);
    const batch = await this.prisma.openingBalanceBatch.findFirst({ where: { id, companyId }, include: { lines: true } });
    if (!batch) throw new BadRequestException("Opening balance batch was not found");
    if (batch.status === "POSTED") throw new BadRequestException("Opening balance batch is already posted");

    const journal = await this.postJournal(companyId, userId, {
      entryDate: batch.openingDate,
      sourceType: "OPENING_BALANCE",
      sourceDocumentId: batch.id,
      memo: `Opening balances ${batch.batchNo}`,
      lines: batch.lines.map((line) => ({
        accountId: line.accountId,
        debit: Number(line.debit),
        credit: Number(line.credit),
        description: line.description || batch.batchNo
      }))
    });
    const posted = await this.prisma.openingBalanceBatch.update({
      where: { id: batch.id },
      data: { status: "POSTED", journalEntryId: journal.id },
      include: { journalEntry: true, lines: { include: { account: true } } }
    });

    await this.audit.record({ companyId, userId, action: "post_opening_balance", module: "accounting", recordType: "OpeningBalanceBatch", recordId: posted.id, afterValue: posted });
    return posted;
  }

  async createYearEndClose(companyId: string, userId: string, dto: CreateYearEndCloseDto) {
    await this.ensureDefaults(companyId, userId);
    const period = await this.prisma.financialPeriod.findFirst({ where: { id: dto.periodId, companyId } });
    if (!period) throw new BadRequestException("Financial period was not found");
    if (period.status !== "OPEN") throw new BadRequestException("Financial period must be open before year-end close");

    const retainedEarnings = dto.retainedEarningsAccountId
      ? await this.prisma.account.findFirst({ where: { id: dto.retainedEarningsAccountId, companyId, type: "EQUITY", isActive: true } })
      : await this.prisma.account.findFirst({ where: { companyId, code: "3000", isActive: true } });
    if (!retainedEarnings) throw new BadRequestException("Retained earnings account was not found");

    const accounts = await this.prisma.account.findMany({
      where: { companyId, type: { in: ["REVENUE", "EXPENSE"] } },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              entryDate: { gte: period.startDate, lte: period.endDate },
              status: "POSTED"
            }
          }
        }
      },
      orderBy: { code: "asc" }
    });

    const closingLines: Array<{ accountId: string; debit: number; credit: number; description?: string }> = [];
    let totalRevenue = 0;
    let totalExpenses = 0;
    for (const account of accounts) {
      const debit = account.journalLines.reduce((sum, line) => sum + Number(line.debit), 0);
      const credit = account.journalLines.reduce((sum, line) => sum + Number(line.credit), 0);
      if (account.type === "REVENUE") {
        const balance = credit - debit;
        if (balance > 0) {
          totalRevenue += balance;
          closingLines.push({ accountId: account.id, debit: balance, credit: 0, description: `Close ${account.code}` });
        }
      } else {
        const balance = debit - credit;
        if (balance > 0) {
          totalExpenses += balance;
          closingLines.push({ accountId: account.id, debit: 0, credit: balance, description: `Close ${account.code}` });
        }
      }
    }
    const netIncome = totalRevenue - totalExpenses;
    if (Math.abs(netIncome) < 0.0001) throw new BadRequestException("No income statement balance is available to close");
    closingLines.push({
      accountId: retainedEarnings.id,
      debit: netIncome < 0 ? Math.abs(netIncome) : 0,
      credit: netIncome > 0 ? netIncome : 0,
      description: `Close ${period.code} to retained earnings`
    });

    const closingDate = dto.closingDate ? this.parseDate(dto.closingDate, "closingDate") : period.endDate;
    const close = await this.prisma.$transaction(async (tx) => {
      const closeNo = await this.nextAccountingDocumentNo(tx, companyId, "yearEndClose", "YEC");
      const created = await tx.yearEndClose.create({
        data: {
          companyId,
          closeNo,
          periodId: period.id,
          closingDate,
          retainedEarningsAccountId: retainedEarnings.id,
          netIncome: this.decimalText(netIncome),
          notes: dto.notes?.trim() || undefined,
          createdById: userId
        }
      });
      return created;
    });

    const journal = await this.postJournal(companyId, userId, {
      entryDate: closingDate,
      sourceType: "YEAR_END_CLOSE",
      sourceDocumentId: close.id,
      memo: `Year-end close ${period.code}`,
      lines: closingLines
    });

    const posted = await this.prisma.$transaction(async (tx) => {
      await tx.financialPeriod.update({ where: { id: period.id }, data: { status: "YEAR_CLOSED" } });
      return tx.yearEndClose.update({
        where: { id: close.id },
        data: { journalEntryId: journal.id },
        include: {
          period: { select: { code: true, name: true, status: true } },
          retainedEarningsAccount: { select: { code: true, name: true } },
          journalEntry: { select: { journalNo: true } }
        }
      });
    });

    await this.audit.record({ companyId, userId, action: "year_end_close", module: "accounting", recordType: "YearEndClose", recordId: posted.id, afterValue: posted });
    return posted;
  }

  async taxSummary(companyId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { companyId, code: { in: ["1300", "2100"] } },
      include: { journalLines: true },
      orderBy: { code: "asc" }
    });
    const inputTax = accounts.find((account) => account.code === "1300");
    const outputTax = accounts.find((account) => account.code === "2100");
    const inputAmount = inputTax ? inputTax.journalLines.reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0) : 0;
    const outputAmount = outputTax ? outputTax.journalLines.reduce((sum, line) => sum + Number(line.credit) - Number(line.debit), 0) : 0;
    return {
      inputTax: this.decimalText(inputAmount),
      outputTax: this.decimalText(outputAmount),
      netTaxPayable: this.decimalText(outputAmount - inputAmount),
      rows: [
        { id: "input-tax", account: inputTax?.code ?? "1300", name: inputTax?.name ?? "Input Tax", amount: this.decimalText(inputAmount), direction: "RECOVERABLE" },
        { id: "output-tax", account: outputTax?.code ?? "2100", name: outputTax?.name ?? "Output Tax", amount: this.decimalText(outputAmount), direction: "PAYABLE" }
      ]
    };
  }

  async financialStatements(companyId: string) {
    const trial = await this.trialBalance(companyId);
    const byType = (type: string) => trial.rows.filter((row) => row.type === type);
    const sum = (rows: Array<{ balance: string }>) => rows.reduce((total, row) => total + Number(row.balance), 0);
    const assets = byType("ASSET");
    const liabilities = byType("LIABILITY");
    const equity = byType("EQUITY");
    const revenue = byType("REVENUE");
    const expenses = byType("EXPENSE");
    const totalRevenue = sum(revenue);
    const totalExpenses = sum(expenses);
    const netIncome = totalRevenue - totalExpenses;
    const bankRows = trial.rows.filter((row) => row.code === "1000");
    const cashBalance = sum(bankRows);

    return {
      balanceSheet: {
        assets,
        liabilities,
        equity: [...equity, { id: "current-earnings", code: "3999", name: "Current Earnings", type: "EQUITY", debit: "0", credit: "0", balance: this.decimalText(netIncome) }],
        totalAssets: this.decimalText(sum(assets)),
        totalLiabilities: this.decimalText(sum(liabilities)),
        totalEquity: this.decimalText(sum(equity) + netIncome)
      },
      profitAndLoss: {
        revenue,
        expenses,
        totalRevenue: this.decimalText(totalRevenue),
        totalExpenses: this.decimalText(totalExpenses),
        netIncome: this.decimalText(netIncome)
      },
      cashFlow: {
        openingCash: "0",
        netCashMovement: this.decimalText(cashBalance),
        closingCash: this.decimalText(cashBalance),
        rows: bankRows
      }
    };
  }

  private async postSalesInvoice(companyId: string, userId: string, id: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({ where: { id, companyId }, include: { customer: true } });
    if (!invoice) throw new BadRequestException("Sales invoice was not found");
    const accounts = await this.requiredAccounts(companyId);
    return this.postJournal(companyId, userId, {
      entryDate: invoice.invoiceDate,
      sourceType: "SALES_INVOICE",
      sourceDocumentId: invoice.id,
      memo: `Sales invoice ${invoice.invoiceNo}`,
      lines: [
        { accountId: accounts.ar.id, debit: Number(invoice.total), credit: 0, description: invoice.invoiceNo },
        { accountId: accounts.sales.id, debit: 0, credit: Number(invoice.subtotal), description: invoice.invoiceNo },
        ...(Number(invoice.taxTotal) > 0 ? [{ accountId: accounts.outputTax.id, debit: 0, credit: Number(invoice.taxTotal), description: invoice.invoiceNo }] : [])
      ]
    });
  }

  private async postCustomerReceipt(companyId: string, userId: string, id: string) {
    const receipt = await this.prisma.receipt.findFirst({ where: { id, companyId } });
    if (!receipt) throw new BadRequestException("Customer receipt was not found");
    const accounts = await this.requiredAccounts(companyId);
    return this.postJournal(companyId, userId, {
      entryDate: receipt.receiptDate,
      sourceType: "CUSTOMER_RECEIPT",
      sourceDocumentId: receipt.id,
      memo: `Customer receipt ${receipt.receiptNo}`,
      lines: [
        { accountId: accounts.bank.id, debit: Number(receipt.amount), credit: 0, description: receipt.receiptNo },
        { accountId: accounts.ar.id, debit: 0, credit: Number(receipt.amount), description: receipt.receiptNo }
      ]
    });
  }

  private async postSupplierInvoice(companyId: string, userId: string, id: string) {
    const invoice = await this.prisma.supplierInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) throw new BadRequestException("Supplier invoice was not found");
    const accounts = await this.requiredAccounts(companyId);
    return this.postJournal(companyId, userId, {
      entryDate: invoice.invoiceDate,
      sourceType: "SUPPLIER_INVOICE",
      sourceDocumentId: invoice.id,
      memo: `Supplier invoice ${invoice.invoiceNo}`,
      lines: [
        { accountId: accounts.purchases.id, debit: Number(invoice.subtotal), credit: 0, description: invoice.invoiceNo },
        ...(Number(invoice.taxTotal) > 0 ? [{ accountId: accounts.inputTax.id, debit: Number(invoice.taxTotal), credit: 0, description: invoice.invoiceNo }] : []),
        { accountId: accounts.ap.id, debit: 0, credit: Number(invoice.total), description: invoice.invoiceNo }
      ]
    });
  }

  private async postSupplierPayment(companyId: string, userId: string, id: string) {
    const payment = await this.prisma.supplierPayment.findFirst({ where: { id, companyId } });
    if (!payment) throw new BadRequestException("Supplier payment was not found");
    const accounts = await this.requiredAccounts(companyId);
    return this.postJournal(companyId, userId, {
      entryDate: payment.paymentDate,
      sourceType: "SUPPLIER_PAYMENT",
      sourceDocumentId: payment.id,
      memo: `Supplier payment ${payment.paymentNo}`,
      lines: [
        { accountId: accounts.ap.id, debit: Number(payment.amount), credit: 0, description: payment.paymentNo },
        { accountId: accounts.bank.id, debit: 0, credit: Number(payment.amount), description: payment.paymentNo }
      ]
    });
  }

  private async postJournal(
    companyId: string,
    userId: string,
    params: {
      entryDate: Date;
      sourceType: string;
      sourceDocumentId?: string;
      memo?: string;
      lines: Array<{ accountId: string; debit: number; credit: number; description?: string }>;
    }
  ) {
    if (params.lines.length < 2) throw new BadRequestException("Journal entry needs at least two lines");
    await this.assertOpenPeriod(companyId, params.entryDate);
    const totalDebit = params.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = params.lines.reduce((sum, line) => sum + line.credit, 0);
    if (Math.round(totalDebit * 10000) !== Math.round(totalCredit * 10000)) throw new BadRequestException("Journal entry is not balanced");
    if (totalDebit <= 0) throw new BadRequestException("Journal entry total must be greater than zero");
    for (const line of params.lines) {
      if (line.debit < 0 || line.credit < 0) throw new BadRequestException("Journal amounts cannot be negative");
      if ((line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0)) {
        throw new BadRequestException("Each journal line must have either debit or credit");
      }
    }

    const accounts = await this.prisma.account.findMany({ where: { companyId, id: { in: params.lines.map((line) => line.accountId) }, isActive: true } });
    if (accounts.length !== new Set(params.lines.map((line) => line.accountId)).size) throw new BadRequestException("One or more accounts are invalid");

    const created = await this.prisma.$transaction(async (tx) => {
      const journalNo = await this.nextDocumentNo(tx, companyId, "journalEntry", "JE");
      return tx.journalEntry.create({
        data: {
          companyId,
          journalNo,
          entryDate: params.entryDate,
          sourceType: params.sourceType,
          sourceDocumentId: params.sourceDocumentId,
          memo: params.memo,
          totalDebit: this.decimalText(totalDebit),
          totalCredit: this.decimalText(totalCredit),
          postedById: userId,
          lines: {
            create: params.lines.map((line) => ({
              companyId,
              accountId: line.accountId,
              debit: this.decimalText(line.debit),
              credit: this.decimalText(line.credit),
              description: line.description
            }))
          }
        },
        include: { lines: { include: { account: true } } }
      });
    });

    await this.audit.record({ companyId, userId, action: "post_journal", module: "accounting", recordType: "JournalEntry", recordId: created.id, afterValue: created });
    return created;
  }

  private normalizeJournalLines(lines: CreateJournalEntryDto["lines"]) {
    return lines.map((line) => ({
      accountId: line.accountId,
      debit: this.parseMoney(line.debit ?? "0", "debit"),
      credit: this.parseMoney(line.credit ?? "0", "credit"),
      description: line.description?.trim() || undefined
    }));
  }

  private async validateJournalLines(companyId: string, lines: Array<{ accountId: string; debit: number; credit: number }>) {
    if (lines.length < 2) throw new BadRequestException("Journal entry needs at least two lines");
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
    if (Math.round(totalDebit * 10000) !== Math.round(totalCredit * 10000)) throw new BadRequestException("Journal entry is not balanced");
    if (totalDebit <= 0) throw new BadRequestException("Journal entry total must be greater than zero");
    for (const line of lines) {
      if ((line.debit > 0 && line.credit > 0) || (line.debit === 0 && line.credit === 0)) {
        throw new BadRequestException("Each journal line must have either debit or credit");
      }
    }
    const accounts = await this.prisma.account.findMany({ where: { companyId, id: { in: lines.map((line) => line.accountId) }, isActive: true } });
    if (accounts.length !== new Set(lines.map((line) => line.accountId)).size) throw new BadRequestException("One or more accounts are invalid");
  }

  private async assertOpenPeriod(companyId: string, date: Date) {
    const period = await this.prisma.financialPeriod.findFirst({
      where: { companyId, startDate: { lte: date }, endDate: { gte: date } }
    });
    if (!period) throw new BadRequestException("No financial period exists for the journal date");
    if (period.status !== "OPEN") throw new BadRequestException("Financial period is closed");
  }

  private async requiredAccounts(companyId: string) {
    const accounts = await this.prisma.account.findMany({ where: { companyId, code: { in: ["1000", "1100", "1300", "2000", "2100", "4000", "5100"] } } });
    const byCode = new Map(accounts.map((account) => [account.code, account]));
    const required = (code: string) => {
      const account = byCode.get(code);
      if (!account) throw new BadRequestException(`Required account ${code} is missing`);
      return account;
    };
    return {
      bank: required("1000"),
      ar: required("1100"),
      inputTax: required("1300"),
      ap: required("2000"),
      outputTax: required("2100"),
      sales: required("4000"),
      purchases: required("5100")
    };
  }

  private async nextDocumentNo(tx: Prisma.TransactionClient, companyId: string, model: "journalEntry" | "supplierPayment", prefix: string) {
    const count = model === "journalEntry" ? await tx.journalEntry.count({ where: { companyId } }) : await tx.supplierPayment.count({ where: { companyId } });
    return `${prefix}-${String(count + 1).padStart(5, "0")}`;
  }

  private async nextAccountingDocumentNo(tx: Prisma.TransactionClient, companyId: string, model: "bankReconciliation" | "openingBalanceBatch" | "yearEndClose", prefix: string) {
    const count =
      model === "bankReconciliation"
        ? await tx.bankReconciliation.count({ where: { companyId } })
        : model === "openingBalanceBatch"
          ? await tx.openingBalanceBatch.count({ where: { companyId } })
          : await tx.yearEndClose.count({ where: { companyId } });
    return `${prefix}-${String(count + 1).padStart(5, "0")}`;
  }

  private nextRecurringDate(date: Date, frequency: string) {
    const next = new Date(date);
    if (frequency === "YEARLY") next.setFullYear(next.getFullYear() + 1);
    else if (frequency === "QUARTERLY") next.setMonth(next.getMonth() + 3);
    else next.setMonth(next.getMonth() + 1);
    return next;
  }

  private normalBalance(type: string) {
    return ["ASSET", "EXPENSE"].includes(type) ? "DEBIT" : "CREDIT";
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
}
