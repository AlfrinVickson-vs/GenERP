import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Boxes,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Columns3,
  ClipboardList,
  Database,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Factory,
  FileClock,
  FileText,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  Package,
  Paperclip,
  Plus,
  Save,
  Scale,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sun,
  Tags,
  Trash2,
  Warehouse,
  Truck,
  Upload,
  UserRound,
  Users,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ApiUser, CompanySettings, DashboardSummary } from "@erp/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const queryClient = new QueryClient();

type OrgUnit = {
  id: string;
  code: string;
  name: string;
  branchId?: string | null;
  address?: string | null;
  isActive: boolean;
};

type AuditRow = {
  id: string;
  action: string;
  module: string;
  recordType: string | null;
  createdAt: string;
  user?: { displayName: string; email: string } | null;
};

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: { code: string } }[];
};

type PermissionRow = {
  id: string;
  code: string;
  module: string;
  action: string;
  description?: string | null;
};

type UserRow = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  status: string;
  mfaEnabled: boolean;
  roles: { role: { id: string; name: string } }[];
};

type CustomerRow = {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  status: string;
};

type SupplierRow = {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  status: string;
};

type ItemRow = {
  id: string;
  code: string;
  name: string;
  itemType: string;
  sellingPrice: string;
  reorderLevel: string;
  unitOfMeasureId?: string | null;
  warehouseId?: string | null;
  unitConversion?: string | null;
  isActive: boolean;
};

type StockBalanceRow = {
  id: string;
  quantityOnHand: string;
  averageCost: string;
  item: {
    id: string;
    code: string;
    name: string;
    itemType: string;
    unitOfMeasure?: { code: string; name: string } | null;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
};

type StockLedgerRow = {
  id: string;
  movementType: string;
  sourceType: string;
  sourceDocumentId: string;
  quantityIn: string;
  quantityOut: string;
  unitCost: string;
  valuationAmount: string;
  balanceAfter: string;
  postedAt: string;
  item: { id: string; code: string; name: string };
  warehouse: { id: string; code: string; name: string };
};

type StockTransferRow = {
  id: string;
  transferNo: string;
  status: string;
  quantity: string;
  unitCost: string;
  valuationAmount: string;
  postedAt: string;
  item: { id: string; code: string; name: string };
  fromWarehouse: { id: string; code: string; name: string };
  toWarehouse: { id: string; code: string; name: string };
};

type StockCountRow = {
  id: string;
  countNo: string;
  status: string;
  countedAt: string;
  warehouse: { id: string; code: string; name: string };
  lines: Array<{
    id: string;
    systemQuantity: string;
    countedQuantity: string;
    varianceQuantity: string;
    valuationAmount: string;
    item: { id: string; code: string; name: string };
  }>;
};

type StockAdjustmentRow = {
  id: string;
  adjustmentNo: string;
  reason: string;
  status: string;
  postedAt: string;
  warehouse: { id: string; code: string; name: string };
  lines: Array<{
    id: string;
    movementType: string;
    quantity: string;
    unitCost: string;
    valuationAmount: string;
    item: { id: string; code: string; name: string };
  }>;
};

type InventoryValuation = {
  totalValue: string;
  rows: Array<{
    id: string;
    quantityOnHand: string;
    averageCost: string;
    valuationAmount: string;
    item: { id: string; code: string; name: string };
    warehouse: { id: string; code: string; name: string };
  }>;
};

type InventoryImportTarget = "transfers" | "counts" | "adjustments";

type InventoryImportPreview = {
  target: InventoryImportTarget;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows?: number;
  createdDocuments?: number;
  rows: Array<{
    rowNumber: number;
    normalized: Record<string, string>;
    errors: string[];
  }>;
};

type InventoryImportPreviewTableRow = {
  id: string;
  rowNumber: number;
  itemCode: string;
  fromWarehouseCode: string;
  toWarehouseCode: string;
  warehouseCode: string;
  movementType: string;
  quantity: string;
  countedQuantity: string;
  unitCost: string;
  reason: string;
  status: string;
};

type MasterRow = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
  ratePercent?: string | null;
  days?: number | null;
  isActive: boolean;
};

type ImportPreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
  normalized: Record<string, string | number | boolean | undefined>;
  errors: string[];
};

type ImportPreview = {
  target: "customers" | "suppliers" | "items" | "masters";
  masterKind?: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  background?: boolean;
  queuedRows?: number;
  importedRows?: number;
  importJob?: ImportJobRow;
  rows: ImportPreviewRow[];
};

type ImportJobRow = {
  id: string;
  target: string;
  masterKind?: string | null;
  status: string;
  totalRows: number;
  processedRows: number;
  importedRows: number;
  failedRows: number;
  errorJson?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  requestedBy?: { displayName: string; email: string } | null;
};

type AttachmentTarget = {
  recordType: "customer" | "supplier" | "item" | "master_data";
  recordId: string;
  label: string;
};

type AttachmentRow = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
  uploadedBy?: { displayName: string; email: string } | null;
};

type LeadRow = {
  id: string;
  code: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  expectedValue: string;
};

type OpportunityRow = {
  id: string;
  code: string;
  title: string;
  stage: string;
  status: string;
  expectedValue: string;
  customer?: { code: string; name: string } | null;
};

type SalesDocumentRow = {
  id: string;
  quoteNo?: string;
  orderNo?: string;
  deliveryNo?: string;
  status: string;
  total?: string;
  customer?: { code: string; name: string } | null;
  salesOrder?: { orderNo: string } | null;
  lines?: Array<{ id: string; description: string; quantity: string; unitPrice?: string; reservedQuantity?: string; deliveryLines?: Array<{ quantity: string }> }>;
  _count?: { salesOrders?: number };
};

type ActivityRow = {
  id: string;
  code: string;
  type: string;
  subject: string;
  status: string;
  priority: string;
  dueAt?: string | null;
  customer?: { code: string; name: string } | null;
  opportunity?: { code: string; title: string } | null;
};

type EnquiryRow = {
  id: string;
  enquiryNo: string;
  subject: string;
  status: string;
  expectedValue: string;
  customer?: { code: string; name: string } | null;
  quotations?: Array<{ quoteNo: string; status: string }>;
};

type FinanceDocumentRow = {
  id: string;
  invoiceNo?: string;
  receiptNo?: string;
  creditNoteNo?: string;
  returnNo?: string;
  status: string;
  total?: string;
  amount?: string;
  paidAmount?: string;
  customer?: { code: string; name: string } | null;
  salesOrder?: { orderNo: string } | null;
  salesInvoice?: { invoiceNo: string } | null;
  lines?: Array<{ id: string; salesOrderLineId?: string; description: string; quantity: string; unitPrice?: string }>;
};

type AccountRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  isCash: boolean;
  isActive: boolean;
};

type FinancialPeriodRow = {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
};

type JournalEntryRow = {
  id: string;
  journalNo: string;
  entryDate: string;
  sourceType: string;
  sourceDocumentId?: string | null;
  memo?: string | null;
  totalDebit: string;
  totalCredit: string;
  status: string;
  lines?: Array<{ id: string; debit: string; credit: string; account: { code: string; name: string; type: string } }>;
};

type SupplierPaymentRow = {
  id: string;
  paymentNo: string;
  amount: string;
  method: string;
  status: string;
  supplier: { code: string; name: string };
  supplierInvoice?: { invoiceNo: string; supplierInvoiceNo: string; total: string; paidAmount: string; status: string } | null;
};

type TrialBalanceReport = {
  totalDebit: string;
  totalCredit: string;
  rows: Array<{ id: string; code: string; name: string; type: string; debit: string; credit: string; balance: string }>;
};

type AgeingReport = {
  receivables: Array<{ id: string; documentNo: string; party: string; bucket: string; outstanding: string; status: string }>;
  payables: Array<{ id: string; documentNo: string; supplierInvoiceNo?: string; party: string; bucket: string; outstanding: string; status: string }>;
};

type BankReconciliationRow = {
  id: string;
  reconciliationNo: string;
  statementDate: string;
  statementBalance: string;
  bookBalance: string;
  reconciledAmount: string;
  difference: string;
  status: string;
  bankAccount: { code: string; name: string };
  lines?: Array<{ id: string }>;
};

type TaxSummaryReport = {
  inputTax: string;
  outputTax: string;
  netTaxPayable: string;
  rows: Array<{ id: string; account: string; name: string; amount: string; direction: string }>;
};

type FinancialStatementsReport = {
  balanceSheet: {
    assets: TrialBalanceReport["rows"];
    liabilities: TrialBalanceReport["rows"];
    equity: TrialBalanceReport["rows"];
    totalAssets: string;
    totalLiabilities: string;
    totalEquity: string;
  };
  profitAndLoss: {
    revenue: TrialBalanceReport["rows"];
    expenses: TrialBalanceReport["rows"];
    totalRevenue: string;
    totalExpenses: string;
    netIncome: string;
  };
  cashFlow: {
    openingCash: string;
    netCashMovement: string;
    closingCash: string;
    rows: TrialBalanceReport["rows"];
  };
};

type RecurringJournalRow = {
  id: string;
  code: string;
  name: string;
  frequency: string;
  nextRunDate: string;
  status: string;
  memo?: string | null;
  lines: Array<{ id: string; debit: string; credit: string; account: { code: string; name: string; type: string } }>;
};

type BudgetRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  period?: { code: string; name: string; status: string } | null;
  lines: Array<{ id: string; month?: number | null; amount: string; account: { code: string; name: string; type: string } }>;
};

type OpeningBalanceBatchRow = {
  id: string;
  batchNo: string;
  openingDate: string;
  totalDebit: string;
  totalCredit: string;
  status: string;
  journalEntry?: { journalNo: string } | null;
  lines: Array<{ id: string; debit: string; credit: string; account: { code: string; name: string; type: string } }>;
};

type YearEndCloseRow = {
  id: string;
  closeNo: string;
  closingDate: string;
  netIncome: string;
  status: string;
  period: { code: string; name: string; status: string };
  retainedEarningsAccount: { code: string; name: string };
  journalEntry?: { journalNo: string } | null;
};

type EmployeeRow = {
  id: string;
  employeeCode: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  employmentType: string;
  status: string;
  branch?: { code: string; name: string } | null;
  department?: { code: string; name: string } | null;
  manager?: { employeeCode: string; displayName: string } | null;
};

type LeaveTypeRow = {
  id: string;
  code: string;
  name: string;
  daysPerYear: string;
  isActive: boolean;
};

type LeaveRequestRow = {
  id: string;
  startDate: string;
  endDate: string;
  days: string;
  status: string;
  reason?: string | null;
  employee: { employeeCode: string; displayName: string };
  leaveType: { code: string; name: string };
};

type AttendanceRow = {
  id: string;
  attendanceDate: string;
  shiftName?: string | null;
  clockIn?: string | null;
  clockOut?: string | null;
  status: string;
  notes?: string | null;
  employee: { employeeCode: string; displayName: string };
};

type ExpenseClaimRow = {
  id: string;
  claimNo: string;
  expenseDate: string;
  category: string;
  amount: string;
  status: string;
  description?: string | null;
  employee: { employeeCode: string; displayName: string };
};

type HolidayRow = {
  id: string;
  holidayDate: string;
  name: string;
  region?: string | null;
  isPaid: boolean;
};

type LeaveBalanceRow = {
  id: string;
  employeeCode: string;
  employeeName: string;
  leaveType: string;
  entitlement: string;
  used: string;
  balance: string;
};

type ChecklistRow = {
  id: string;
  checklistNo: string;
  type: string;
  status: string;
  dueDate?: string | null;
  employee: { employeeCode: string; displayName: string };
  lines: Array<{ id: string; task: string; ownerRole?: string | null; dueDate?: string | null; status: string; completedAt?: string | null }>;
};

type CertificationAlertRow = {
  id: string;
  employeeCode: string;
  employeeName: string;
  certification: string;
  expiryDate: string;
  status: string;
};

type ApprovalRow = {
  id: string;
  documentType: string;
  documentNo?: string | null;
  amount?: string | null;
  status: string;
  currentStep: number;
  submittedBy?: { displayName: string; email: string } | null;
  steps: Array<{ id: string; sequence: number; approverRole: string; status: string; comments?: string | null; approverUser?: { displayName: string; email: string } | null }>;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
};

type ReportCell = string | number | boolean | null;

type ReportRow = Record<string, ReportCell>;

type ReportPayload = {
  generatedAt: string;
  metrics: ReportRow[];
  tables: Array<{ title: string; rows: ReportRow[] }>;
};

type IntegrationStatus = {
  generatedAt: string;
  email: { provider: string; status: string; from?: string | null };
  tally: { status: string; exportPath?: string | null; format: string };
  apiDocs: { status: string; url: string };
};

type TallyVoucherExport = {
  generatedAt: string;
  source: string;
  vouchers: Array<{
    voucherNo: string;
    voucherDate: string;
    voucherType: string;
    narration?: string | null;
    totalDebit: string;
    totalCredit: string;
    lines: Array<{ ledgerCode: string; ledgerName: string; debit: string; credit: string; description?: string | null }>;
  }>;
};

type EmailDeliveryRow = {
  id: string;
  kind: string;
  format: string;
  recipientsJson: string;
  subject: string;
  status: string;
  provider?: string | null;
  attachmentName?: string | null;
  error?: string | null;
  createdAt: string;
  sentAt?: string | null;
  requestedBy?: { displayName: string; email: string } | null;
};

type ReportScheduleRow = {
  id: string;
  name: string;
  kind: string;
  format: string;
  recipientsJson: string;
  subject?: string | null;
  frequency: string;
  status: string;
  nextRunAt: string;
  lastRunAt?: string | null;
  lastDeliveryLogId?: string | null;
  createdBy?: { displayName: string; email: string } | null;
};

type PurchaseDocumentRow = {
  id: string;
  requestNo?: string;
  rfqNo?: string;
  quoteNo?: string;
  poNo?: string;
  receiptNo?: string;
  invoiceNo?: string;
  supplierInvoiceNo?: string;
  returnNo?: string;
  status: string;
  matchingStatus?: string;
  total?: string;
  paidAmount?: string;
  varianceJson?: string | null;
  supplier?: { code: string; name: string } | null;
  purchaseRequest?: { requestNo: string } | null;
  purchaseOrder?: { poNo: string } | null;
  goodsReceipt?: { receiptNo: string } | null;
  lines?: Array<{ id: string; itemId: string; description: string; quantity: string; unitPrice?: string; receivedQuantity?: string }>;
  supplierQuotations?: Array<{ quoteNo: string; total: string; supplier?: { code: string; name: string } | null }>;
};

type RfqComparison = {
  rfqNo: string;
  best?: { quoteNo: string; supplier?: { code: string; name: string } | null; total: string } | null;
  quotations: Array<{ quoteNo: string; supplier?: { code: string; name: string } | null; total: string; leadTimeDays?: number | null }>;
};

type FulfilmentReport = {
  summary: {
    openOrders: number;
    partiallyDeliveredOrders: number;
    deliveredOrders: number;
    backorderLines: number;
    totalBackorderQuantity: string;
  };
  backorderLines: Array<{
    id: string;
    salesOrderId: string;
    orderNo: string;
    customer?: { code: string; name: string } | null;
    item?: { code: string; name: string } | null;
    description: string;
    status: string;
    orderedQuantity: string;
    deliveredQuantity: string;
    backorderQuantity: string;
    reservedQuantity: string;
  }>;
};

type SavedTableView = {
  name: string;
  columns: string[];
  searchTerm: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      }
    });
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  return response.json() as Promise<T>;
}

function AppShell() {
  const [queryClientState] = useState(() => queryClient);
  return (
    <QueryClientProvider client={queryClientState}>
      <ErpApp />
    </QueryClientProvider>
  );
}

function ErpApp() {
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<ApiUser>("/auth/me"),
    retry: false
  });
  const branches = useQuery({
    queryKey: ["topbar", "branches"],
    queryFn: () => api<OrgUnit[]>("/branches"),
    enabled: Boolean(me.data)
  });
  const notifications = useQuery({
    queryKey: ["topbar", "notifications"],
    queryFn: () => api<NotificationRow[]>("/hr/notifications"),
    enabled: Boolean(me.data)
  });
  const shellCompany = useQuery({
    queryKey: ["company"],
    queryFn: () => api<CompanySettings>("/company"),
    enabled: Boolean(me.data)
  });

  useEffect(() => {
    const storedBranchId = window.localStorage.getItem("erp:selectedBranchId");
    const storedTheme = window.localStorage.getItem("erp:theme");
    if (storedBranchId) setSelectedBranchId(storedBranchId);
    if (storedTheme === "dark") setDarkMode(true);
  }, []);

  useEffect(() => {
    if (!branches.data?.length) return;
    const activeBranches = branches.data.filter((branch) => branch.isActive);
    const validSelection = activeBranches.some((branch) => branch.id === selectedBranchId);
    const nextBranchId = validSelection ? selectedBranchId : activeBranches[0]?.id ?? branches.data[0]?.id ?? "";
    if (nextBranchId && nextBranchId !== selectedBranchId) setSelectedBranchId(nextBranchId);
  }, [branches.data, selectedBranchId]);

  useEffect(() => {
    if (!selectedBranchId) return;
    window.localStorage.setItem("erp:selectedBranchId", selectedBranchId);
  }, [selectedBranchId]);

  useEffect(() => {
    window.localStorage.setItem("erp:theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  if (me.isLoading) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-600">Loading ERP workspace...</div>;
  }

  if (!me.data) {
    return <LoginScreen />;
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "master-data", label: "Master Data", icon: Database },
    { id: "sales-crm", label: "Sales & CRM", icon: FileText },
    { id: "purchase", label: "Purchasing", icon: ShoppingCart },
    { id: "inventory", label: "Inventory", icon: Warehouse },
    { id: "accounting", label: "Accounting", icon: CircleDollarSign },
    { id: "hr", label: "HR & Approvals", icon: UserRound },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "company", label: "Company", icon: Building2 },
    { id: "organisation", label: "Organisation", icon: Factory },
    { id: "users", label: "Users", icon: Users },
    { id: "roles", label: "Roles", icon: ShieldCheck },
    { id: "audit", label: "Audit Logs", icon: FileClock }
  ];
  const selectedBranch = branches.data?.find((branch) => branch.id === selectedBranchId);
  const unreadNotifications = (notifications.data ?? []).filter((notification) => !notification.readAt).length;
  const quickCreateItems = [
    { label: "Customer", view: "master-data", description: "Open master-data create forms" },
    { label: "Sales invoice", view: "sales-crm", description: "Open Sales & CRM finance workflow" },
    { label: "Purchase order", view: "purchase", description: "Open purchasing documents" },
    { label: "Journal entry", view: "accounting", description: "Open accounting journals" },
    { label: "Employee", view: "hr", description: "Open HR employee workflow" },
    { label: "Report schedule", view: "reports", description: "Open report integrations" }
  ];

  return (
    <div className={`flex min-h-screen bg-[#f4f7f5] text-ink ${darkMode ? "erp-dark" : ""}`}>
      <aside
        className={`border-r border-[#24463d] bg-[#0f2f28] text-white shadow-xl shadow-slate-900/10 transition-all ${sidebarOpen ? "w-72" : "w-20"} hidden shrink-0 md:block`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          {shellCompany.data?.logoUrl ? (
            <img className="h-9 w-9 rounded bg-white object-contain p-1 shadow-sm" src={shellCompany.data.logoUrl} alt={`${shellCompany.data.name} logo`} />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded bg-white text-sm font-semibold text-pine shadow-sm">E</div>
          )}
          {sidebarOpen ? (
            <div>
              <div className="text-sm font-semibold">{shellCompany.data?.name ?? "GENSIS ERP"}</div>
              <div className="text-xs text-emerald-100/70">Single-company system</div>
            </div>
          ) : null}
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`focus-ring flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm ${
                  activeView === item.id ? "bg-white text-pine shadow-sm" : "text-emerald-50/80 hover:bg-white/10 hover:text-white"
                }`}
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen ? <span>{item.label}</span> : null}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-line bg-white px-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="focus-ring rounded border border-line bg-white p-2 text-slate-600 shadow-sm hover:border-sky/40 hover:bg-sky/5 hover:text-sky"
              onClick={() => setSidebarOpen((value) => !value)}
              title="Toggle navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <select
              className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm shadow-sm md:hidden"
              value={activeView}
              onChange={(event) => setActiveView(event.target.value)}
              aria-label="Main navigation"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="hidden min-w-0 items-center gap-2 rounded border border-line bg-slate-50 px-3 py-2 md:flex md:w-96">
              <Search className="h-4 w-4 text-sky" />
              <input className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" placeholder="Search records" />
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <select
              className="focus-ring min-w-36 rounded border border-line bg-white px-3 py-2 text-sm shadow-sm"
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}
              title={selectedBranch ? `Active branch: ${selectedBranch.name}` : "Select active branch"}
              aria-label="Active branch"
            >
              {(branches.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="focus-ring rounded border border-line bg-white p-2 text-slate-600 shadow-sm hover:border-copper/40 hover:bg-copper/5 hover:text-copper"
              title="Quick create"
              aria-expanded={quickCreateOpen}
              onClick={() => {
                setQuickCreateOpen((value) => !value);
                setNotificationsOpen(false);
              }}
            >
              <Plus className="h-4 w-4" />
            </button>
            {quickCreateOpen ? (
              <div className="absolute right-28 top-11 z-20 w-64 overflow-hidden rounded border border-line bg-white shadow-xl shadow-slate-900/10">
                <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase text-slate-500">Quick Create</div>
                {quickCreateItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="focus-ring block w-full px-3 py-2 text-left hover:bg-slate-50"
                    onClick={() => {
                      setActiveView(item.view);
                      setQuickCreateOpen(false);
                    }}
                  >
                    <div className="text-sm font-medium text-slate-800">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.description}</div>
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className="focus-ring relative rounded border border-line bg-white p-2 text-slate-600 shadow-sm hover:border-plum/40 hover:bg-plum/5 hover:text-plum"
              title="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((value) => !value);
                setQuickCreateOpen(false);
              }}
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 ? <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">{unreadNotifications}</span> : null}
            </button>
            {notificationsOpen ? (
              <div className="absolute right-14 top-11 z-20 w-80 overflow-hidden rounded border border-line bg-white shadow-xl shadow-slate-900/10">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <div className="text-xs font-semibold uppercase text-slate-500">Notifications</div>
                  <button
                    type="button"
                    className="text-xs font-medium text-sky hover:text-pine"
                    onClick={() => {
                      setActiveView("hr");
                      setNotificationsOpen(false);
                    }}
                  >
                    View all
                  </button>
                </div>
                <div className="max-h-80 overflow-auto">
                  {(notifications.data ?? []).length ? (notifications.data ?? []).slice(0, 6).map((notification) => (
                    <div key={notification.id} className="border-b border-line px-3 py-2 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-slate-800">{notification.title}</div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${notification.readAt ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"}`}>
                          {notification.readAt ? "READ" : "NEW"}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-slate-500">{notification.body}</div>
                    </div>
                  )) : <div className="px-3 py-6 text-center text-sm text-slate-500">No notifications.</div>}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="focus-ring rounded border border-line bg-white p-2 text-slate-600 shadow-sm hover:border-sky/40 hover:bg-sky/5 hover:text-sky"
              title={darkMode ? "Light mode" : "Dark mode"}
              aria-pressed={darkMode}
              onClick={() => setDarkMode((value) => !value)}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <LogoutButton />
          </div>
        </header>

        <section className="px-4 py-5 md:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">ERP Workspace</div>
              <h1 className="mt-1 text-2xl font-semibold text-ink">{viewTitle(activeView)}</h1>
            </div>
            <div className="rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
              {me.data.displayName} - {me.data.roles.join(", ")}
              {selectedBranch ? <span className="ml-2 text-slate-400">| {selectedBranch.code}</span> : null}
            </div>
          </div>

          {activeView === "dashboard" ? <DashboardView /> : null}
          {activeView === "master-data" ? <MasterDataView /> : null}
          {activeView === "sales-crm" ? <SalesCrmView /> : null}
          {activeView === "purchase" ? <PurchaseView /> : null}
          {activeView === "inventory" ? <InventoryView /> : null}
          {activeView === "accounting" ? <AccountingView /> : null}
          {activeView === "hr" ? <HrView /> : null}
          {activeView === "reports" ? <ReportsView /> : null}
          {activeView === "company" ? <CompanyView /> : null}
          {activeView === "organisation" ? <OrganisationView /> : null}
          {activeView === "users" ? <UsersView /> : null}
          {activeView === "roles" ? <RolesView /> : null}
          {activeView === "audit" ? <AuditView /> : null}
        </section>
      </main>
    </div>
  );
}

function LoginScreen() {
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const login = useMutation({
    mutationFn: () =>
      api<ApiUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password, totpCode: totpCode || undefined })
      }),
    onSuccess: (user) => queryClient.setQueryData(["me"], user)
  });

  return (
    <main className="grid min-h-screen bg-[#f4f7f5] lg:grid-cols-[1fr_480px]">
      <section className="flex flex-col justify-between bg-[#0f2f28] p-8 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded bg-white text-base font-semibold text-pine shadow-sm">E</div>
          <div>
            <div className="font-semibold">GENSIS ERP</div>
            <div className="text-sm text-emerald-100/70">Operational ERP platform</div>
          </div>
        </div>
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded border border-emerald-200/30 bg-white/10 px-3 py-1 text-sm text-emerald-50">
            <CheckCircle2 className="h-4 w-4" />
            Client review build
          </div>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">GENSIS ERP workspace for one company.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
            Company setup, branches, roles, users, audit logs, finance, inventory, HR, reporting, and integrations are wired into one operational workspace.
          </p>
        </div>
        <div />
      </section>
      <section className="flex items-center justify-center p-6">
        <form
          className="w-full max-w-sm rounded border border-line bg-white p-6 shadow-lg shadow-slate-900/10"
          onSubmit={(event) => {
            event.preventDefault();
            login.mutate();
          }}
        >
          <h2 className="text-xl font-semibold">Sign in</h2>
          <label className="mt-5 block text-sm font-medium">
            Username or email
            <input
              className="focus-ring mt-2 w-full rounded border border-line px-3 py-2"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Password
            <span className="mt-2 flex rounded border border-line bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky">
              <input
                className="min-w-0 flex-1 rounded-l border-0 px-3 py-2 outline-none"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="grid w-11 place-items-center rounded-r text-slate-500 hover:bg-slate-50"
                onClick={() => setShowPassword((value) => !value)}
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <label className="mt-4 block text-sm font-medium">
            MFA code
            <input
              className="focus-ring mt-2 w-full rounded border border-line px-3 py-2"
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value)}
              placeholder="Required only after MFA is enabled"
            />
          </label>
          {login.error ? <p className="mt-3 text-sm text-red-700">{login.error.message}</p> : null}
          <button
            className="focus-ring mt-5 w-full rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244]"
            disabled={login.isPending}
          >
            {login.isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

function DashboardView() {
  const summary = useQuery({ queryKey: ["dashboard"], queryFn: () => api<DashboardSummary>("/dashboard/summary") });
  const data = summary.data;
  const cards: Array<[string, number, LucideIcon, string, string]> = [
    ["Users", data?.users ?? 0, Users, "bg-sky/10 text-sky ring-sky/20", "border-sky/30"],
    ["Roles", data?.roles ?? 0, ShieldCheck, "bg-pine/10 text-pine ring-pine/20", "border-pine/30"],
    ["Branches", data?.branches ?? 0, Building2, "bg-copper/10 text-copper ring-copper/20", "border-copper/30"],
    ["Departments", data?.departments ?? 0, ClipboardList, "bg-plum/10 text-plum ring-plum/20", "border-plum/30"],
    ["Warehouses", data?.warehouses ?? 0, Factory, "bg-emerald-50 text-emerald-700 ring-emerald-200", "border-emerald-200"],
    ["Audit events today", data?.auditEventsToday ?? 0, FileClock, "bg-amber-50 text-amber-700 ring-amber-200", "border-amber-200"],
    ["Failed logins today", data?.failedLoginsToday ?? 0, ShieldCheck, "bg-rose-50 text-rose-700 ring-rose-200", "border-rose-200"],
    ["Approval rules", data?.pendingApprovals ?? 0, CheckCircle2, "bg-indigo-50 text-indigo-700 ring-indigo-200", "border-indigo-200"]
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, Icon, tone, border]) => (
        <div key={label} className={`rounded border ${border} bg-white p-4 shadow-sm`}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-600">{label}</div>
            <div className={`grid h-9 w-9 place-items-center rounded ring-1 ${tone}`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-semibold text-ink">{value}</div>
        </div>
      ))}
    </div>
  );
}

function MasterDataView() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<"customers" | "suppliers" | "items" | "masters">("customers");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState("");
  const [itemType, setItemType] = useState("Stock");
  const [itemUnitOfMeasureId, setItemUnitOfMeasureId] = useState("");
  const [itemWarehouseId, setItemWarehouseId] = useState("");
  const [itemUnitConversion, setItemUnitConversion] = useState("1");
  const [masterSymbol, setMasterSymbol] = useState("");
  const [masterRatePercent, setMasterRatePercent] = useState("");
  const [masterDays, setMasterDays] = useState("");
  const [masterKind, setMasterKind] = useState("item-categories");
  const [importFileName, setImportFileName] = useState("");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Array<Record<string, string>>>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [attachmentTarget, setAttachmentTarget] = useState<AttachmentTarget | null>(null);
  const [openingItemId, setOpeningItemId] = useState("");
  const [openingWarehouseId, setOpeningWarehouseId] = useState("");
  const [openingQuantity, setOpeningQuantity] = useState("");
  const [openingUnitCost, setOpeningUnitCost] = useState("");
  const [openingRemarks, setOpeningRemarks] = useState("");

  const customers = useQuery({ queryKey: ["master-data", "customers"], queryFn: () => api<CustomerRow[]>("/master-data/customers") });
  const suppliers = useQuery({ queryKey: ["master-data", "suppliers"], queryFn: () => api<SupplierRow[]>("/master-data/suppliers") });
  const items = useQuery({ queryKey: ["master-data", "items"], queryFn: () => api<ItemRow[]>("/master-data/items") });
  const masters = useQuery({ queryKey: ["master-data", masterKind], queryFn: () => api<MasterRow[]>(`/master-data/${masterKind}`) });
  const units = useQuery({ queryKey: ["master-data", "units"], queryFn: () => api<MasterRow[]>("/master-data/units") });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: () => api<OrgUnit[]>("/warehouses") });
  const stockBalances = useQuery({ queryKey: ["inventory", "stock-balances"], queryFn: () => api<StockBalanceRow[]>("/inventory/stock-balances") });
  const importJobs = useQuery({
    queryKey: ["master-data", "import-jobs"],
    queryFn: () => api<ImportJobRow[]>("/master-data/import/jobs"),
    refetchInterval: 5000
  });

  const saveRecord = useMutation({
    mutationFn: () => {
      if (active === "customers") {
        return api(`/master-data/customers${editingId ? `/${editingId}` : ""}`, {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify({ code, name, email: email || undefined, phone: phone || undefined })
        });
      }

      if (active === "suppliers") {
        return api(`/master-data/suppliers${editingId ? `/${editingId}` : ""}`, {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify({ code, name, email: email || undefined, phone: phone || undefined })
        });
      }

      if (active === "items") {
        return api(`/master-data/items${editingId ? `/${editingId}` : ""}`, {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify({
            code,
            name,
            itemType,
            unitOfMeasureId: itemUnitOfMeasureId || undefined,
            warehouseId: itemWarehouseId || undefined,
            unitConversion: itemUnitConversion || "1",
            sellingPrice: price || "0",
            purchasePrice: "0"
          })
        });
      }

      return api(`/master-data/${masterKind}${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({
          code,
          name,
          symbol: masterKind === "currencies" ? masterSymbol || undefined : undefined,
          ratePercent: masterKind === "tax-codes" ? masterRatePercent || "0" : undefined,
          days: masterKind === "payment-terms" ? Number(masterDays || 0) : undefined
        })
      });
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["master-data"] });
    }
  });

  const toggleRecord = useMutation({
    mutationFn: (row: CustomerRow | SupplierRow | ItemRow | MasterRow) => {
      if (active === "customers") {
        const customer = row as CustomerRow;
        return api(`/master-data/customers/${customer.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: customer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })
        });
      }

      if (active === "suppliers") {
        const supplier = row as SupplierRow;
        return api(`/master-data/suppliers/${supplier.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: supplier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })
        });
      }

      if (active === "items") {
        const item = row as ItemRow;
        return api(`/master-data/items/${item.id}/active`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: !item.isActive })
        });
      }

      const master = row as MasterRow;
      return api(`/master-data/${masterKind}/${master.id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !master.isActive })
      });
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["master-data"] });
    }
  });

  const previewImport = useMutation({
    mutationFn: () =>
      api<ImportPreview>("/master-data/import/preview", {
        method: "POST",
        body: JSON.stringify(importPayload())
      }),
    onSuccess: (preview) => setImportPreview(preview)
  });

  const commitImport = useMutation({
    mutationFn: () =>
      api<ImportPreview>("/master-data/import/commit", {
        method: "POST",
        body: JSON.stringify(importPayload())
      }),
    onSuccess: async (preview) => {
      setImportPreview(preview);
      await queryClient.invalidateQueries({ queryKey: ["master-data"] });
      await queryClient.invalidateQueries({ queryKey: ["master-data", "import-jobs"] });
    }
  });

  const postOpeningStock = useMutation({
    mutationFn: () =>
      api("/inventory/opening-stock", {
        method: "POST",
        body: JSON.stringify({
          itemId: openingItemId,
          warehouseId: openingWarehouseId,
          quantity: openingQuantity,
          unitCost: openingUnitCost || "0",
          remarks: openingRemarks || undefined
        })
      }),
    onSuccess: async () => {
      setOpeningItemId("");
      setOpeningWarehouseId("");
      setOpeningQuantity("");
      setOpeningUnitCost("");
      setOpeningRemarks("");
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
    }
  });

  const tabs: Array<[typeof active, string, LucideIcon, string]> = [
    ["customers", "Customers", UserRound, "border-sky/30 bg-sky/10 text-sky"],
    ["suppliers", "Suppliers", Truck, "border-copper/30 bg-copper/10 text-copper"],
    ["items", "Items", Package, "border-plum/30 bg-plum/10 text-plum"],
    ["masters", "Supporting Masters", Tags, "border-emerald-200 bg-emerald-50 text-emerald-700"]
  ];
  const masterOptions = [
    ["item-categories", "Item Categories"],
    ["customer-categories", "Customer Categories"],
    ["supplier-categories", "Supplier Categories"],
    ["units", "Units"],
    ["tax-codes", "Tax Codes"],
    ["currencies", "Currencies"],
    ["payment-terms", "Payment Terms"]
  ];
  const summaryCards: Array<[string, number, LucideIcon, string]> = [
    ["Customers", customers.data?.length ?? 0, UserRound, "bg-sky/10 text-sky ring-sky/20"],
    ["Suppliers", suppliers.data?.length ?? 0, Truck, "bg-copper/10 text-copper ring-copper/20"],
    ["Items", items.data?.length ?? 0, Boxes, "bg-plum/10 text-plum ring-plum/20"],
    ["Current Master", masters.data?.length ?? 0, CircleDollarSign, "bg-emerald-50 text-emerald-700 ring-emerald-200"]
  ];
  const activeTab = tabs.find(([id]) => id === active);
  const ActiveIcon = activeTab?.[2] ?? Database;
  const formTitle = active === "masters" ? (editingId ? "Edit supporting master record" : "Add supporting master record") : editingId ? `Edit ${active.slice(0, -1)}` : `Create ${active.slice(0, -1)}`;
  const masterColumns = masterKind === "tax-codes"
    ? (["code", "name", "ratePercent", "isActive"] as (keyof MasterRow)[])
    : masterKind === "currencies"
      ? (["code", "name", "symbol", "isActive"] as (keyof MasterRow)[])
      : masterKind === "payment-terms"
        ? (["code", "name", "days", "isActive"] as (keyof MasterRow)[])
        : (["code", "name", "isActive"] as (keyof MasterRow)[]);
  const importFields = importFieldsFor(active, masterKind);
  const validImportRows = importPreview?.rows.filter((row) => row.errors.length === 0).length ?? 0;
  const invalidImportRows = importPreview?.rows.filter((row) => row.errors.length > 0) ?? [];
  const recentImportJobs = importJobs.data ?? [];

  function importPayload() {
    return {
      target: active,
      masterKind: active === "masters" ? masterKind : undefined,
      rows: importRows,
      mapping: importMapping
    };
  }

  function resetImportState() {
    setImportFileName("");
    setImportHeaders([]);
    setImportRows([]);
    setImportMapping({});
    setImportPreview(null);
  }

  function resetForm() {
    setEditingId(null);
    setCode("");
    setName("");
    setEmail("");
    setPhone("");
    setPrice("");
    setItemType("Stock");
    setItemUnitOfMeasureId("");
    setItemWarehouseId("");
    setItemUnitConversion("1");
    setMasterSymbol("");
    setMasterRatePercent("");
    setMasterDays("");
  }

  function switchTab(next: typeof active) {
    setActive(next);
    resetForm();
    resetImportState();
    setAttachmentTarget(null);
  }

  function beginCustomerEdit(row: CustomerRow) {
    setActive("customers");
    setEditingId(row.id);
    setCode(row.code);
    setName(row.name);
    setEmail(row.email ?? "");
    setPhone(row.phone ?? "");
    setPrice("");
  }

  function beginSupplierEdit(row: SupplierRow) {
    setActive("suppliers");
    setEditingId(row.id);
    setCode(row.code);
    setName(row.name);
    setEmail(row.email ?? "");
    setPhone(row.phone ?? "");
    setPrice("");
  }

  function beginItemEdit(row: ItemRow) {
    setActive("items");
    setEditingId(row.id);
    setCode(row.code);
    setName(row.name);
    setEmail("");
    setPhone("");
    setPrice(String(row.sellingPrice ?? ""));
    setItemType(row.itemType ?? "Stock");
    setItemUnitOfMeasureId(row.unitOfMeasureId ?? "");
    setItemWarehouseId(row.warehouseId ?? "");
    setItemUnitConversion(String(row.unitConversion ?? "1"));
  }

  function beginMasterEdit(row: MasterRow) {
    setActive("masters");
    setEditingId(row.id);
    setCode(row.code);
    setName(row.name);
    setEmail("");
    setPhone("");
    setPrice("");
    setMasterSymbol(row.symbol ?? "");
    setMasterRatePercent(String(row.ratePercent ?? ""));
    setMasterDays(row.days === null || row.days === undefined ? "" : String(row.days));
  }

  async function loadImportFile(file: File | null) {
    if (!file) return;
    const parsed = parseCsv(await file.text());
    setImportFileName(file.name);
    setImportHeaders(parsed.headers);
    setImportRows(parsed.rows);
    setImportMapping(defaultImportMapping(importFields, parsed.headers));
    setImportPreview(null);
  }

  function openAttachments(row: CustomerRow | SupplierRow | ItemRow | MasterRow) {
    const recordType = active === "customers" ? "customer" : active === "suppliers" ? "supplier" : active === "items" ? "item" : "master_data";
    setAttachmentTarget({ recordType, recordId: row.id, label: `${String(row.code)} - ${String(row.name)}` });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        {summaryCards.map(([label, value, Icon, tone]) => (
          <div key={label} className="rounded border border-line bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-600">{label}</div>
              <div className={`grid h-9 w-9 place-items-center rounded ring-1 ${tone}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label, Icon, tone]) => (
          <button
            key={id}
            type="button"
            className={`focus-ring inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium shadow-sm ${
              active === id ? tone : "border-line bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => switchTab(id)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <section className="rounded border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">CSV Import</div>
              <div className="text-xs text-slate-500">{importFileName || "No file selected"}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-sky/40 hover:bg-sky/5 hover:text-sky"
              onClick={() => downloadImportTemplate(active, masterKind)}
            >
              <Download className="h-4 w-4" />
              Template
            </button>
            <label className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
              <Upload className="h-4 w-4" />
              Upload CSV
              <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void loadImportFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {importHeaders.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {importFields.map((field) => (
                <label key={field} className="text-sm">
                  {formatColumn(field)}
                  <select
                    className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2"
                    value={importMapping[field] ?? ""}
                    onChange={(event) => {
                      setImportMapping((current) => ({ ...current, [field]: event.target.value }));
                      setImportPreview(null);
                    }}
                  >
                    <option value="">Not mapped</option>
                    {importHeaders.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              {importRows.length > 0 ? `${importRows.length} source rows loaded` : "Upload a CSV to start"}
              {importPreview ? ` - ${validImportRows} valid, ${importPreview.invalidRows} with errors` : ""}
            </div>
            <div className="flex flex-wrap gap-2">
              {invalidImportRows.length > 0 ? (
                <button
                  type="button"
                  className="focus-ring inline-flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100"
                  onClick={() => downloadImportErrorReport(invalidImportRows)}
                >
                  <Download className="h-4 w-4" />
                  Error Report
                </button>
              ) : null}
              <button
                type="button"
                className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                disabled={importRows.length === 0 || previewImport.isPending}
                onClick={() => previewImport.mutate()}
              >
                <Search className="h-4 w-4" />
                {previewImport.isPending ? "Validating..." : "Validate"}
              </button>
              <button
                type="button"
                className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50"
                disabled={!importPreview || importPreview.validRows === 0 || importPreview.importedRows !== undefined || commitImport.isPending}
                onClick={() => commitImport.mutate()}
              >
                <Save className="h-4 w-4" />
                {commitImport.isPending ? "Importing..." : importPreview?.background ? "Queued" : importPreview?.importedRows !== undefined ? "Imported" : "Confirm Import"}
              </button>
            </div>
          </div>

          {previewImport.error ? <div className="text-sm text-red-700">{previewImport.error.message}</div> : null}
          {commitImport.error ? <div className="text-sm text-red-700">{commitImport.error.message}</div> : null}
          {importPreview?.background && importPreview.importJob ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
              <div className="inline-flex items-center gap-2">
                <FileClock className="h-4 w-4" />
                Import job queued with {importPreview.queuedRows ?? importPreview.importJob.totalRows} rows
              </div>
              <ImportJobStatusPill status={importPreview.importJob.status} />
            </div>
          ) : null}

          {importPreview ? (
            <div className="overflow-x-auto rounded border border-line">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="bg-[#eef4f1] text-left text-xs uppercase text-slate-600">
                  <tr>
                    <th className="border-b border-line px-3 py-2">Row</th>
                    <th className="border-b border-line px-3 py-2">Code</th>
                    <th className="border-b border-line px-3 py-2">Name</th>
                    <th className="border-b border-line px-3 py-2">Status</th>
                    <th className="border-b border-line px-3 py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.slice(0, 8).map((row) => (
                    <tr key={row.rowNumber} className="border-b border-line last:border-0">
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="px-3 py-2">
                        <CellValue column="code" value={row.normalized.code} />
                      </td>
                      <td className="px-3 py-2">{String(row.normalized.name ?? "-")}</td>
                      <td className="px-3 py-2">
                        <StatusPill value={row.errors.length === 0 ? "ACTIVE" : "INACTIVE"} />
                      </td>
                      <td className={row.errors.length === 0 ? "px-3 py-2 text-emerald-700" : "px-3 py-2 text-red-700"}>
                        {row.errors.length === 0 ? "Ready" : row.errors.join(" ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>

      {recentImportJobs.length > 0 ? (
        <section className="rounded border border-line bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200">
                <FileClock className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">Recent import jobs</div>
                <div className="text-xs text-slate-500">Large CSV commits are processed in the background.</div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-white text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="border-b border-line px-4 py-2">Target</th>
                  <th className="border-b border-line px-4 py-2">Status</th>
                  <th className="border-b border-line px-4 py-2">Progress</th>
                  <th className="border-b border-line px-4 py-2">Imported</th>
                  <th className="border-b border-line px-4 py-2">Started</th>
                </tr>
              </thead>
              <tbody>
                {recentImportJobs.slice(0, 5).map((job) => (
                  <tr key={job.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{job.masterKind ? formatColumn(job.masterKind) : formatColumn(job.target)}</div>
                      <div className="font-mono text-xs text-slate-500">{job.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ImportJobStatusPill status={job.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {job.processedRows}/{job.totalRows}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {job.importedRows} ok, {job.failedRows} failed
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(job.startedAt ?? job.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">Opening Stock</div>
              <div className="text-xs text-slate-500">Post one initial stock balance per item and warehouse through the stock ledger.</div>
            </div>
          </div>
        </div>
        <form
          className="grid gap-3 p-4 md:grid-cols-6"
          onSubmit={(event) => {
            event.preventDefault();
            postOpeningStock.mutate();
          }}
        >
          <label className="text-sm md:col-span-2">
            Item
            <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={openingItemId} onChange={(event) => setOpeningItemId(event.target.value)} required>
              <option value="">Select item</option>
              {(items.data ?? [])
                .filter((item) => item.isActive && ["stock", "consumable"].includes(String(item.itemType).toLowerCase()))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            Warehouse
            <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={openingWarehouseId} onChange={(event) => setOpeningWarehouseId(event.target.value)} required>
              <option value="">Select warehouse</option>
              {(warehouses.data ?? [])
                .filter((warehouse) => warehouse.isActive)
                .map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm">
            Quantity
            <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={openingQuantity} onChange={(event) => setOpeningQuantity(event.target.value)} required />
          </label>
          <label className="text-sm">
            Unit Cost
            <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={openingUnitCost} onChange={(event) => setOpeningUnitCost(event.target.value)} placeholder="0" />
          </label>
          <label className="text-sm md:col-span-5">
            Remarks
            <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={openingRemarks} onChange={(event) => setOpeningRemarks(event.target.value)} />
          </label>
          <div className="flex items-end justify-end">
            <button className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50" disabled={postOpeningStock.isPending}>
              <Save className="h-4 w-4" />
              {postOpeningStock.isPending ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
        {postOpeningStock.error ? <div className="mx-4 mb-3 text-sm text-red-700">{postOpeningStock.error.message}</div> : null}
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-white text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="border-b border-line px-4 py-2">Item</th>
                <th className="border-b border-line px-4 py-2">Warehouse</th>
                <th className="border-b border-line px-4 py-2">Unit</th>
                <th className="border-b border-line px-4 py-2">On Hand</th>
                <th className="border-b border-line px-4 py-2">Average Cost</th>
              </tr>
            </thead>
            <tbody>
              {(stockBalances.data ?? []).length > 0 ? (
                (stockBalances.data ?? []).map((balance) => (
                  <tr key={balance.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{balance.item.name}</div>
                      <div className="font-mono text-xs text-slate-500">{balance.item.code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{balance.warehouse.code}</td>
                    <td className="px-4 py-3 text-slate-700">{balance.item.unitOfMeasure?.code ?? "-"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{String(balance.quantityOnHand)}</td>
                    <td className="px-4 py-3 text-slate-700">{String(balance.averageCost)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={5}>
                    No opening stock posted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <form
        className="rounded border border-line bg-white shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          saveRecord.mutate();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`grid h-9 w-9 place-items-center rounded ring-1 ${activeTab?.[3] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">{formTitle}</div>
              <div className="text-xs text-slate-500">Codes and names are required for clean downstream transactions.</div>
            </div>
          </div>
          {editingId ? (
            <button type="button" className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm hover:bg-slate-50" onClick={resetForm}>
              <X className="h-4 w-4" />
              Cancel edit
            </button>
          ) : null}
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-5">
          {active === "masters" ? (
            <label className="text-sm">
              Type
              <select
                className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
                value={masterKind}
                onChange={(event) => {
                  setMasterKind(event.target.value);
                  resetForm();
                  resetImportState();
                }}
                disabled={Boolean(editingId)}
              >
                {masterOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-sm">
            Code
            <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={code} onChange={(event) => setCode(event.target.value)} required />
          </label>
          <label className="text-sm">
            Name
            <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          {active === "customers" || active === "suppliers" ? (
            <>
              <label className="text-sm">
                Email
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="text-sm">
                Phone
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
            </>
          ) : null}
          {active === "items" ? (
            <>
              <label className="text-sm">
                Type
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={itemType} onChange={(event) => setItemType(event.target.value)}>
                  {["Stock", "Consumable", "Service", "Non-stock", "Fixed Asset"].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Unit
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={itemUnitOfMeasureId} onChange={(event) => setItemUnitOfMeasureId(event.target.value)}>
                  <option value="">No unit</option>
                  {(units.data ?? [])
                    .filter((unit) => unit.isActive)
                    .map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.code} - {unit.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm">
                Warehouse
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={itemWarehouseId} onChange={(event) => setItemWarehouseId(event.target.value)}>
                  <option value="">No default</option>
                  {(warehouses.data ?? [])
                    .filter((warehouse) => warehouse.isActive)
                    .map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} - {warehouse.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm">
                Conversion
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={itemUnitConversion} onChange={(event) => setItemUnitConversion(event.target.value)} />
              </label>
              <label className="text-sm">
                Selling Price
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={price} onChange={(event) => setPrice(event.target.value)} />
              </label>
            </>
          ) : null}
          {active === "masters" && masterKind === "tax-codes" ? (
            <label className="text-sm">
              Rate %
              <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={masterRatePercent} onChange={(event) => setMasterRatePercent(event.target.value)} />
            </label>
          ) : null}
          {active === "masters" && masterKind === "currencies" ? (
            <label className="text-sm">
              Symbol
              <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={masterSymbol} onChange={(event) => setMasterSymbol(event.target.value)} />
            </label>
          ) : null}
          {active === "masters" && masterKind === "payment-terms" ? (
            <label className="text-sm">
              Days
              <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={masterDays} onChange={(event) => setMasterDays(event.target.value)} />
            </label>
          ) : null}
        </div>
        {saveRecord.error ? <div className="mx-4 mb-3 text-sm text-red-700">{saveRecord.error.message}</div> : null}
        {toggleRecord.error ? <div className="mx-4 mb-3 text-sm text-red-700">{toggleRecord.error.message}</div> : null}
        <div className="flex justify-end border-t border-line px-4 py-3">
          <button className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244]" disabled={saveRecord.isPending}>
            <Save className="h-4 w-4" />
            {saveRecord.isPending ? "Saving..." : editingId ? "Save changes" : "Create"}
          </button>
        </div>
      </form>

      {active === "customers" ? <DataTable rows={customers.data ?? []} columns={["code", "name", "contactPerson", "email", "phone", "status"]} title="Customers" onEdit={beginCustomerEdit} onToggle={(row) => toggleRecord.mutate(row)} onAttachments={openAttachments} /> : null}
      {active === "suppliers" ? <DataTable rows={suppliers.data ?? []} columns={["code", "name", "contactPerson", "email", "phone", "status"]} title="Suppliers" onEdit={beginSupplierEdit} onToggle={(row) => toggleRecord.mutate(row)} onAttachments={openAttachments} /> : null}
      {active === "items" ? <DataTable rows={items.data ?? []} columns={["code", "name", "itemType", "sellingPrice", "reorderLevel", "isActive"]} title="Items" onEdit={beginItemEdit} onToggle={(row) => toggleRecord.mutate(row)} onAttachments={openAttachments} /> : null}
      {active === "masters" ? <DataTable rows={masters.data ?? []} columns={masterColumns} title="Supporting Masters" onEdit={beginMasterEdit} onToggle={(row) => toggleRecord.mutate(row)} onAttachments={openAttachments} /> : null}

      {attachmentTarget ? <AttachmentPanel target={attachmentTarget} onClose={() => setAttachmentTarget(null)} /> : null}
    </div>
  );
}

function SalesCrmView() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<"leads" | "opportunities" | "activities" | "enquiries" | "quotations" | "orders" | "deliveries" | "finance">("leads");
  const [financeAction, setFinanceAction] = useState<"invoice" | "receipt" | "credit" | "return">("invoice");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [enquiryId, setEnquiryId] = useState("");
  const [salesOrderId, setSalesOrderId] = useState("");
  const [salesOrderLineId, setSalesOrderLineId] = useState("");
  const [salesInvoiceId, setSalesInvoiceId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");

  const leads = useQuery({ queryKey: ["sales", "leads"], queryFn: () => api<LeadRow[]>("/sales/leads") });
  const opportunities = useQuery({ queryKey: ["sales", "opportunities"], queryFn: () => api<OpportunityRow[]>("/sales/opportunities") });
  const activities = useQuery({ queryKey: ["sales", "activities"], queryFn: () => api<ActivityRow[]>("/sales/activities") });
  const overdueActivities = useQuery({ queryKey: ["sales", "activities", "overdue"], queryFn: () => api<ActivityRow[]>("/sales/activities/overdue") });
  const enquiries = useQuery({ queryKey: ["sales", "enquiries"], queryFn: () => api<EnquiryRow[]>("/sales/enquiries") });
  const quotations = useQuery({ queryKey: ["sales", "quotations"], queryFn: () => api<SalesDocumentRow[]>("/sales/quotations") });
  const orders = useQuery({ queryKey: ["sales", "orders"], queryFn: () => api<SalesDocumentRow[]>("/sales/orders") });
  const deliveries = useQuery({ queryKey: ["sales", "deliveries"], queryFn: () => api<SalesDocumentRow[]>("/sales/deliveries") });
  const fulfilment = useQuery({ queryKey: ["sales", "fulfilment-report"], queryFn: () => api<FulfilmentReport>("/sales/fulfilment-report") });
  const invoices = useQuery({ queryKey: ["sales", "invoices"], queryFn: () => api<FinanceDocumentRow[]>("/sales/invoices") });
  const receipts = useQuery({ queryKey: ["sales", "receipts"], queryFn: () => api<FinanceDocumentRow[]>("/sales/receipts") });
  const creditNotes = useQuery({ queryKey: ["sales", "credit-notes"], queryFn: () => api<FinanceDocumentRow[]>("/sales/credit-notes") });
  const returns = useQuery({ queryKey: ["sales", "returns"], queryFn: () => api<FinanceDocumentRow[]>("/sales/returns") });
  const customers = useQuery({ queryKey: ["master-data", "customers"], queryFn: () => api<CustomerRow[]>("/master-data/customers") });
  const items = useQuery({ queryKey: ["master-data", "items"], queryFn: () => api<ItemRow[]>("/master-data/items") });

  const selectedItem = items.data?.find((item) => item.id === itemId);
  const selectedOrder = orders.data?.find((order) => order.id === salesOrderId);
  const selectedDeliveryLine = selectedOrder?.lines?.find((line) => line.id === salesOrderLineId);
  const selectedInvoice = invoices.data?.find((invoice) => invoice.id === salesInvoiceId);

  useEffect(() => {
    if (active !== "deliveries") return;
    const nextLine = selectedOrder?.lines?.find((line) => lineRemainingQuantity(line) > 0);
    setSalesOrderLineId(nextLine?.id ?? "");
  }, [active, selectedOrder?.id, selectedOrder?.lines]);

  const save = useMutation({
    mutationFn: () => {
      if (active === "leads") {
        return api("/sales/leads", {
          method: "POST",
          body: JSON.stringify({ name, companyName: companyName || undefined, email: email || undefined, expectedValue: unitPrice || "0", notes: notes || undefined })
        });
      }

      if (active === "opportunities") {
        return api("/sales/opportunities", {
          method: "POST",
          body: JSON.stringify({ title: name, customerId: customerId || undefined, expectedValue: unitPrice || "0", notes: notes || undefined })
        });
      }

      if (active === "activities") {
        return api("/sales/activities", {
          method: "POST",
          body: JSON.stringify({ subject: name, customerId: customerId || undefined, opportunityId: opportunityId || undefined, dueAt: dueAt || undefined, notes: notes || undefined })
        });
      }

      if (active === "enquiries") {
        return api("/sales/enquiries", {
          method: "POST",
          body: JSON.stringify({ customerId, subject: name, expectedValue: unitPrice || "0", dueAt: dueAt || undefined, notes: notes || undefined })
        });
      }

      if (active === "quotations") {
        return api("/sales/quotations", {
          method: "POST",
          body: JSON.stringify({
            customerId,
            opportunityId: opportunityId || undefined,
            enquiryId: enquiryId || undefined,
            notes: notes || undefined,
            lines: [salesLinePayload()]
          })
        });
      }

      if (active === "orders") {
        return api("/sales/orders", {
          method: "POST",
          body: JSON.stringify({
            customerId,
            notes: notes || undefined,
            lines: [salesLinePayload()]
          })
        });
      }

      if (active === "deliveries") {
        const line = selectedDeliveryLine;
        return api("/sales/deliveries", {
          method: "POST",
          body: JSON.stringify({
            salesOrderId,
            notes: notes || undefined,
            lines: line ? [{ salesOrderLineId: line.id, quantity }] : undefined
          })
        });
      }

      if (active === "finance") {
        if (financeAction === "invoice") {
          return api("/sales/invoices", {
            method: "POST",
            body: JSON.stringify({ salesOrderId, dueDate: dueAt || undefined, notes: notes || undefined })
          });
        }

        if (financeAction === "receipt") {
          return api("/sales/receipts", {
            method: "POST",
            body: JSON.stringify({ salesInvoiceId, amount: unitPrice || "0", method: "BANK", reference: notes || undefined })
          });
        }

        if (financeAction === "credit") {
          return api("/sales/credit-notes", {
            method: "POST",
            body: JSON.stringify({ salesInvoiceId, reason: notes || undefined })
          });
        }

        const line = selectedDeliveryLine;
        return api("/sales/returns", {
          method: "POST",
          body: JSON.stringify({
            salesOrderId,
            reason: notes || undefined,
            lines: line ? [{ salesOrderLineId: line.id, quantity }] : []
          })
        });
      }

      throw new Error("Unsupported Sales & CRM action");
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
    }
  });

  const convertQuotation = useMutation({
    mutationFn: (row: { id: string }) =>
      api(`/sales/quotations/${row.id}/convert-to-order`, {
        method: "POST",
        body: JSON.stringify({})
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      setActive("orders");
    }
  });

  const reviseQuotation = useMutation({
    mutationFn: (row: { id: string }) =>
      api(`/sales/quotations/${row.id}/revise`, {
        method: "POST",
        body: JSON.stringify({ notes: "Revised from Sales & CRM workspace" })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      setActive("quotations");
    }
  });

  const completeActivity = useMutation({
    mutationFn: (row: { id: string }) => api(`/sales/activities/${row.id}/complete`, { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
    }
  });

  const tabs: Array<[typeof active, string, LucideIcon, string]> = [
    ["leads", "Leads", UserRound, "border-sky/30 bg-sky/10 text-sky"],
    ["opportunities", "Opportunities", CircleDollarSign, "border-emerald-200 bg-emerald-50 text-emerald-700"],
    ["activities", "Activities", Bell, "border-amber-200 bg-amber-50 text-amber-700"],
    ["enquiries", "Enquiries", FileClock, "border-cyan-200 bg-cyan-50 text-cyan-700"],
    ["quotations", "Quotations", FileText, "border-indigo-200 bg-indigo-50 text-indigo-700"],
    ["orders", "Sales Orders", ClipboardList, "border-copper/30 bg-copper/10 text-copper"],
    ["deliveries", "Deliveries", Truck, "border-plum/30 bg-plum/10 text-plum"],
    ["finance", "Finance", FileSpreadsheet, "border-pine/30 bg-pine/10 text-pine"]
  ];
  const activeTab = tabs.find(([id]) => id === active);
  const ActiveIcon = activeTab?.[2] ?? FileText;

  function salesLinePayload() {
    return {
      itemId: itemId || undefined,
      description: selectedItem ? `${selectedItem.code} - ${selectedItem.name}` : name,
      quantity,
      unitPrice,
      discountPercent: "0",
      taxRate: "0"
    };
  }

  function resetForm() {
    setName("");
    setCompanyName("");
    setEmail("");
    setCustomerId("");
    setOpportunityId("");
    setEnquiryId("");
    setSalesOrderId("");
    setSalesOrderLineId("");
    setSalesInvoiceId("");
    setItemId("");
    setQuantity("1");
    setUnitPrice("0");
    setDueAt("");
    setNotes("");
  }

  function lineDeliveredQuantity(line: NonNullable<SalesDocumentRow["lines"]>[number]) {
    return (line.deliveryLines ?? []).reduce((sum, deliveryLine) => sum + Number(deliveryLine.quantity), 0);
  }

  function lineRemainingQuantity(line: NonNullable<SalesDocumentRow["lines"]>[number]) {
    return Math.max(Number(line.quantity) - lineDeliveredQuantity(line), 0);
  }

  function orderLineTotal(order: SalesDocumentRow, field: "quantity" | "reservedQuantity") {
    return (order.lines ?? []).reduce((sum, line) => sum + Number(line[field] ?? "0"), 0);
  }

  function orderDeliveredTotal(order: SalesDocumentRow) {
    return (order.lines ?? []).reduce((sum, line) => sum + lineDeliveredQuantity(line), 0);
  }

  const leadRows = (leads.data ?? []).map((lead) => ({ id: lead.id, code: lead.code, name: lead.name, companyName: lead.companyName ?? "-", email: lead.email ?? "-", status: lead.status, expectedValue: lead.expectedValue }));
  const opportunityRows = (opportunities.data ?? []).map((opportunity) => ({ id: opportunity.id, code: opportunity.code, title: opportunity.title, customer: opportunity.customer?.code ?? "-", stage: opportunity.stage, status: opportunity.status, expectedValue: opportunity.expectedValue }));
  const activityRows = (activities.data ?? []).map((activity) => ({ id: activity.id, code: activity.code, subject: activity.subject, type: activity.type, priority: activity.priority, dueAt: activity.dueAt ? activity.dueAt.slice(0, 10) : "-", status: activity.status, customer: activity.customer?.code ?? "-" }));
  const enquiryRows = (enquiries.data ?? []).map((enquiry) => ({ id: enquiry.id, enquiryNo: enquiry.enquiryNo, customer: enquiry.customer?.code ?? "-", subject: enquiry.subject, status: enquiry.status, expectedValue: enquiry.expectedValue, quotations: enquiry.quotations?.length ?? 0 }));
  const quotationRows = (quotations.data ?? []).map((quotation) => ({
    id: quotation.id,
    quoteNo: quotation.quoteNo ?? "-",
    customer: quotation.customer?.code ?? "-",
    status: quotation.status,
    lines: quotation.lines?.length ?? 0,
    total: quotation.total ?? "0",
    converted: Boolean(quotation._count?.salesOrders)
  }));
  const orderRows = (orders.data ?? []).map((order) => {
    const ordered = orderLineTotal(order, "quantity");
    const delivered = orderDeliveredTotal(order);
    return {
      id: order.id,
      orderNo: order.orderNo ?? "-",
      customer: order.customer?.code ?? "-",
      status: order.status,
      ordered: ordered.toFixed(4),
      delivered: delivered.toFixed(4),
      reserved: orderLineTotal(order, "reservedQuantity").toFixed(4),
      backorder: Math.max(ordered - delivered, 0).toFixed(4),
      total: order.total ?? "0"
    };
  });
  const deliveryRows = (deliveries.data ?? []).map((delivery) => ({ id: delivery.id, deliveryNo: delivery.deliveryNo ?? "-", order: delivery.salesOrder?.orderNo ?? "-", status: delivery.status, lines: delivery.lines?.length ?? 0 }));
  const invoiceRows = (invoices.data ?? []).map((invoice) => ({ id: invoice.id, invoiceNo: invoice.invoiceNo ?? "-", customer: invoice.customer?.code ?? "-", order: invoice.salesOrder?.orderNo ?? "-", status: invoice.status, total: invoice.total ?? "0", paidAmount: invoice.paidAmount ?? "0" }));
  const receiptRows = (receipts.data ?? []).map((receipt) => ({ id: receipt.id, receiptNo: receipt.receiptNo ?? "-", invoice: receipt.salesInvoice?.invoiceNo ?? "-", customer: receipt.customer?.code ?? "-", status: receipt.status, amount: receipt.amount ?? "0" }));
  const creditRows = (creditNotes.data ?? []).map((credit) => ({ id: credit.id, creditNoteNo: credit.creditNoteNo ?? "-", invoice: credit.salesInvoice?.invoiceNo ?? "-", customer: credit.customer?.code ?? "-", status: credit.status, total: credit.total ?? "0" }));
  const returnRows = (returns.data ?? []).map((entry) => ({ id: entry.id, returnNo: entry.returnNo ?? "-", order: entry.salesOrder?.orderNo ?? "-", customer: entry.customer?.code ?? "-", status: entry.status, lines: entry.lines?.length ?? 0 }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-5">
        {tabs.map(([id, label, Icon, tone]) => (
          <button
            key={id}
            type="button"
            className={`focus-ring inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium shadow-sm ${active === id ? tone : "border-line bg-white text-slate-700 hover:bg-slate-50"}`}
            onClick={() => {
              setActive(id);
              resetForm();
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <form
        className="rounded border border-line bg-white shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-3">
          <div className={`grid h-9 w-9 place-items-center rounded ring-1 ${activeTab?.[3] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
            <ActiveIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold">Create {activeTab?.[1]}</div>
            <div className="text-xs text-slate-500">Manage the sales cycle from lead capture to delivery.</div>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-5">
          {active === "leads" || active === "opportunities" ? (
            <>
              <label className="text-sm md:col-span-2">
                {active === "leads" ? "Lead name" : "Opportunity title"}
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              {active === "leads" ? (
                <label className="text-sm">
                  Company
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                </label>
              ) : (
                <CustomerSelect customers={customers.data ?? []} value={customerId} onChange={setCustomerId} />
              )}
              <label className="text-sm">
                {active === "leads" ? "Email" : "Expected value"}
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={active === "leads" ? email : unitPrice} onChange={(event) => (active === "leads" ? setEmail(event.target.value) : setUnitPrice(event.target.value))} />
              </label>
            </>
          ) : null}

          {active === "activities" || active === "enquiries" ? (
            <>
              <label className="text-sm md:col-span-2">
                {active === "activities" ? "Activity subject" : "Enquiry subject"}
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <CustomerSelect customers={customers.data ?? []} value={customerId} onChange={setCustomerId} required={active === "enquiries"} />
              {active === "activities" ? (
                <label className="text-sm">
                  Opportunity
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={opportunityId} onChange={(event) => setOpportunityId(event.target.value)}>
                    <option value="">No opportunity</option>
                    {(opportunities.data ?? []).map((opportunity) => (
                      <option key={opportunity.id} value={opportunity.id}>
                        {opportunity.code} - {opportunity.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="text-sm">
                  Expected value
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required />
                </label>
              )}
              <label className="text-sm">
                Due date
                <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
              </label>
            </>
          ) : null}

          {active === "quotations" || active === "orders" ? (
            <>
              <CustomerSelect customers={customers.data ?? []} value={customerId} onChange={setCustomerId} required />
              {active === "quotations" ? (
                <>
                  <label className="text-sm">
                    Opportunity
                    <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={opportunityId} onChange={(event) => setOpportunityId(event.target.value)}>
                      <option value="">No opportunity</option>
                      {(opportunities.data ?? []).map((opportunity) => (
                        <option key={opportunity.id} value={opportunity.id}>
                          {opportunity.code} - {opportunity.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Enquiry
                    <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={enquiryId} onChange={(event) => setEnquiryId(event.target.value)}>
                      <option value="">No enquiry</option>
                      {(enquiries.data ?? []).map((enquiry) => (
                        <option key={enquiry.id} value={enquiry.id}>
                          {enquiry.enquiryNo} - {enquiry.subject}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
              <ItemSelect items={items.data ?? []} value={itemId} onChange={setItemId} />
              <label className="text-sm">
                Quantity
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
              </label>
              <label className="text-sm">
                Unit price
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required />
              </label>
            </>
          ) : null}

          {active === "deliveries" ? (
            <>
              <label className="text-sm md:col-span-2">
                Sales order
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={salesOrderId} onChange={(event) => setSalesOrderId(event.target.value)} required>
                  <option value="">Select order</option>
                  {(orders.data ?? []).filter((order) => ["CONFIRMED", "PARTIALLY_DELIVERED"].includes(order.status)).map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.orderNo} - {order.customer?.code} - {order.status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm md:col-span-2">
                Order line
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={salesOrderLineId} onChange={(event) => setSalesOrderLineId(event.target.value)} required>
                  <option value="">Select line</option>
                  {(selectedOrder?.lines ?? []).filter((line) => lineRemainingQuantity(line) > 0).map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.description} - remaining {lineRemainingQuantity(line).toFixed(4)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Quantity
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
                <span className="mt-1 block text-xs text-slate-500">Remaining {selectedDeliveryLine ? lineRemainingQuantity(selectedDeliveryLine).toFixed(4) : "0.0000"}</span>
              </label>
            </>
          ) : null}

          {active === "finance" ? (
            <>
              <label className="text-sm">
                Action
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={financeAction} onChange={(event) => setFinanceAction(event.target.value as typeof financeAction)}>
                  <option value="invoice">Issue invoice</option>
                  <option value="receipt">Post receipt</option>
                  <option value="credit">Credit note</option>
                  <option value="return">Sales return</option>
                </select>
              </label>
              {financeAction === "invoice" || financeAction === "return" ? (
                <label className="text-sm md:col-span-2">
                  Sales order
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={salesOrderId} onChange={(event) => setSalesOrderId(event.target.value)} required>
                    <option value="">Select order</option>
                    {(orders.data ?? []).map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.orderNo} - {order.customer?.code} - {order.status}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {financeAction === "receipt" || financeAction === "credit" ? (
                <label className="text-sm md:col-span-2">
                  Invoice
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={salesInvoiceId} onChange={(event) => setSalesInvoiceId(event.target.value)} required>
                    <option value="">Select invoice</option>
                    {(invoices.data ?? []).map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNo} - {invoice.customer?.code} - balance {(Number(invoice.total ?? "0") - Number(invoice.paidAmount ?? "0")).toFixed(4)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {financeAction === "return" ? (
                <>
                  <label className="text-sm md:col-span-2">
                    Order line
                    <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={salesOrderLineId} onChange={(event) => setSalesOrderLineId(event.target.value)} required>
                      <option value="">Select line</option>
                      {(selectedOrder?.lines ?? []).map((line) => (
                        <option key={line.id} value={line.id}>
                          {line.description} - ordered {Number(line.quantity).toFixed(4)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Return qty
                    <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
                  </label>
                </>
              ) : null}
              {financeAction === "receipt" ? (
                <label className="text-sm">
                  Amount
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required />
                </label>
              ) : null}
              {financeAction === "invoice" ? (
                <label className="text-sm">
                  Due date
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
                </label>
              ) : null}
            </>
          ) : null}

          <label className="text-sm md:col-span-4">
            Notes
            <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
        </div>

        {save.error ? <div className="mx-4 mb-3 text-sm text-red-700">{save.error.message}</div> : null}
        {convertQuotation.error ? <div className="mx-4 mb-3 text-sm text-red-700">{convertQuotation.error.message}</div> : null}
        {reviseQuotation.error ? <div className="mx-4 mb-3 text-sm text-red-700">{reviseQuotation.error.message}</div> : null}
        {completeActivity.error ? <div className="mx-4 mb-3 text-sm text-red-700">{completeActivity.error.message}</div> : null}
        <div className="flex justify-end border-t border-line px-4 py-3">
          <button className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50" disabled={save.isPending}>
            <Save className="h-4 w-4" />
            {save.isPending ? "Saving..." : "Create"}
          </button>
        </div>
      </form>

      {active === "leads" ? <DataTable rows={leadRows} columns={["code", "name", "companyName", "email", "status", "expectedValue"]} title="Leads" /> : null}
      {active === "opportunities" ? <DataTable rows={opportunityRows} columns={["code", "title", "customer", "stage", "status", "expectedValue"]} title="Opportunities" /> : null}
      {active === "activities" ? (
        <>
          <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Overdue activities: <span className="font-semibold">{overdueActivities.data?.length ?? 0}</span>
          </div>
          <DataTable rows={activityRows} columns={["code", "subject", "type", "priority", "dueAt", "customer", "status"]} title="Activities" onComplete={(row) => completeActivity.mutate(row)} canComplete={(row) => row.status !== "COMPLETED"} />
        </>
      ) : null}
      {active === "enquiries" ? <DataTable rows={enquiryRows} columns={["enquiryNo", "customer", "subject", "status", "expectedValue", "quotations"]} title="Enquiries" /> : null}
      {active === "quotations" ? (
        <DataTable
          rows={quotationRows}
          columns={["quoteNo", "customer", "status", "lines", "total"]}
          title="Quotations"
          onConvert={(row) => convertQuotation.mutate(row)}
          canConvert={(row) => !row.converted}
          onRevise={(row) => reviseQuotation.mutate(row)}
          canRevise={(row) => row.status !== "SUPERSEDED"}
        />
      ) : null}
      {active === "orders" ? <DataTable rows={orderRows} columns={["orderNo", "customer", "status", "ordered", "delivered", "reserved", "backorder", "total"]} title="Sales Orders" /> : null}
      {active === "deliveries" ? (
        <>
          <FulfilmentDashboard report={fulfilment.data} />
          <DataTable rows={deliveryRows} columns={["deliveryNo", "order", "status", "lines"]} title="Deliveries" />
        </>
      ) : null}
      {active === "finance" ? (
        <div className="space-y-4">
          <DataTable rows={invoiceRows} columns={["invoiceNo", "customer", "order", "status", "total", "paidAmount"]} title="Invoices" />
          <DataTable rows={receiptRows} columns={["receiptNo", "invoice", "customer", "status", "amount"]} title="Receipts" />
          <DataTable rows={creditRows} columns={["creditNoteNo", "invoice", "customer", "status", "total"]} title="Credit Notes" />
          <DataTable rows={returnRows} columns={["returnNo", "order", "customer", "status", "lines"]} title="Sales Returns" />
        </div>
      ) : null}
    </div>
  );
}

function FulfilmentDashboard({ report }: { report?: FulfilmentReport }) {
  const summary = report?.summary;
  const backorderRows = (report?.backorderLines ?? []).map((line) => ({
    id: line.id,
    orderNo: line.orderNo,
    customer: line.customer?.code ?? "-",
    item: line.item?.code ?? "-",
    status: line.status,
    ordered: line.orderedQuantity,
    delivered: line.deliveredQuantity,
    backorder: line.backorderQuantity,
    reserved: line.reservedQuantity
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        {([
          ["Open Orders", summary?.openOrders ?? 0, ClipboardList, "border-sky/20 bg-sky/10 text-sky"],
          ["Partial", summary?.partiallyDeliveredOrders ?? 0, Truck, "border-amber-200 bg-amber-50 text-amber-700"],
          ["Delivered", summary?.deliveredOrders ?? 0, CheckCircle2, "border-emerald-200 bg-emerald-50 text-emerald-700"],
          ["Backorder Lines", summary?.backorderLines ?? 0, FileClock, "border-plum/20 bg-plum/10 text-plum"],
          ["Backorder Qty", summary?.totalBackorderQuantity ?? "0", Boxes, "border-copper/20 bg-copper/10 text-copper"]
        ] satisfies Array<[string, string | number, LucideIcon, string]>).map(([label, value, Icon, tone]) => (
          <div key={String(label)} className={`rounded border p-4 shadow-sm ${tone}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{String(value)}</div>
              </div>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      <DataTable rows={backorderRows} columns={["orderNo", "customer", "item", "status", "ordered", "delivered", "backorder", "reserved"]} title="Backorders" />
    </div>
  );
}

function AccountingView() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<"chart" | "periods" | "journals" | "posting" | "payables" | "reconcile" | "recurring" | "budgets" | "opening" | "yearend" | "tax" | "statements" | "trial" | "ageing">("chart");
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("ASSET");
  const [periodCode, setPeriodCode] = useState("");
  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [amount, setAmount] = useState("1");
  const [memo, setMemo] = useState("");
  const [sourceType, setSourceType] = useState("SALES_INVOICE");
  const [sourceDocumentId, setSourceDocumentId] = useState("");
  const [supplierInvoiceId, setSupplierInvoiceId] = useState("");
  const [method, setMethod] = useState("BANK");
  const [bankAccountId, setBankAccountId] = useState("");
  const [statementDate, setStatementDate] = useState("");
  const [statementBalance, setStatementBalance] = useState("0");
  const [recurringCode, setRecurringCode] = useState("");
  const [recurringName, setRecurringName] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [nextRunDate, setNextRunDate] = useState("");
  const [budgetCode, setBudgetCode] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [budgetPeriodId, setBudgetPeriodId] = useState("");
  const [budgetMonth, setBudgetMonth] = useState("1");
  const [openingDate, setOpeningDate] = useState("");
  const [yearClosePeriodId, setYearClosePeriodId] = useState("");
  const [retainedEarningsAccountId, setRetainedEarningsAccountId] = useState("");

  const accounts = useQuery({ queryKey: ["accounting", "accounts"], queryFn: () => api<AccountRow[]>("/accounting/accounts") });
  const periods = useQuery({ queryKey: ["accounting", "periods"], queryFn: () => api<FinancialPeriodRow[]>("/accounting/periods") });
  const journals = useQuery({ queryKey: ["accounting", "journals"], queryFn: () => api<JournalEntryRow[]>("/accounting/journals") });
  const trialBalance = useQuery({ queryKey: ["accounting", "trial-balance"], queryFn: () => api<TrialBalanceReport>("/accounting/trial-balance") });
  const ageing = useQuery({ queryKey: ["accounting", "ageing"], queryFn: () => api<AgeingReport>("/accounting/ageing") });
  const salesInvoices = useQuery({ queryKey: ["sales", "invoices"], queryFn: () => api<FinanceDocumentRow[]>("/sales/invoices") });
  const receipts = useQuery({ queryKey: ["sales", "receipts"], queryFn: () => api<FinanceDocumentRow[]>("/sales/receipts") });
  const supplierInvoices = useQuery({ queryKey: ["purchase", "invoices"], queryFn: () => api<PurchaseDocumentRow[]>("/purchase/invoices") });
  const supplierPayments = useQuery({ queryKey: ["accounting", "supplier-payments"], queryFn: () => api<SupplierPaymentRow[]>("/accounting/supplier-payments") });
  const reconciliations = useQuery({ queryKey: ["accounting", "bank-reconciliations"], queryFn: () => api<BankReconciliationRow[]>("/accounting/bank-reconciliations") });
  const recurringJournals = useQuery({ queryKey: ["accounting", "recurring-journals"], queryFn: () => api<RecurringJournalRow[]>("/accounting/recurring-journals") });
  const budgets = useQuery({ queryKey: ["accounting", "budgets"], queryFn: () => api<BudgetRow[]>("/accounting/budgets") });
  const openingBalances = useQuery({ queryKey: ["accounting", "opening-balances"], queryFn: () => api<OpeningBalanceBatchRow[]>("/accounting/opening-balances") });
  const yearEndCloses = useQuery({ queryKey: ["accounting", "year-end-closes"], queryFn: () => api<YearEndCloseRow[]>("/accounting/year-end-closes") });
  const taxSummary = useQuery({ queryKey: ["accounting", "tax-summary"], queryFn: () => api<TaxSummaryReport>("/accounting/tax-summary") });
  const statements = useQuery({ queryKey: ["accounting", "financial-statements"], queryFn: () => api<FinancialStatementsReport>("/accounting/financial-statements") });

  const setupDefaults = useMutation({
    mutationFn: () => api("/accounting/defaults", { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounting"] });
    }
  });

  const save = useMutation({
    mutationFn: () => {
      if (active === "chart") {
        return api("/accounting/accounts", { method: "POST", body: JSON.stringify({ code: accountCode, name: accountName, type: accountType }) });
      }
      if (active === "periods") {
        return api("/accounting/periods", { method: "POST", body: JSON.stringify({ code: periodCode, name: periodName, startDate, endDate }) });
      }
      if (active === "journals") {
        return api("/accounting/journals", {
          method: "POST",
          body: JSON.stringify({
            memo: memo || "Manual journal",
            lines: [
              { accountId: debitAccountId, debit: amount, credit: "0", description: memo || undefined },
              { accountId: creditAccountId, debit: "0", credit: amount, description: memo || undefined }
            ]
          })
        });
      }
      if (active === "posting") {
        return api("/accounting/post-source", { method: "POST", body: JSON.stringify({ sourceType, sourceDocumentId }) });
      }
      if (active === "reconcile") {
        return api("/accounting/bank-reconciliations", { method: "POST", body: JSON.stringify({ bankAccountId: bankAccountId || undefined, statementDate, statementBalance, notes: memo || undefined }) });
      }
      if (active === "recurring") {
        return api("/accounting/recurring-journals", {
          method: "POST",
          body: JSON.stringify({
            code: recurringCode,
            name: recurringName,
            frequency,
            nextRunDate,
            memo: memo || undefined,
            lines: [
              { accountId: debitAccountId, debit: amount, credit: "0", description: memo || undefined },
              { accountId: creditAccountId, debit: "0", credit: amount, description: memo || undefined }
            ]
          })
        });
      }
      if (active === "budgets") {
        return api("/accounting/budgets", {
          method: "POST",
          body: JSON.stringify({
            code: budgetCode,
            name: budgetName,
            periodId: budgetPeriodId || undefined,
            lines: [{ accountId: debitAccountId, month: Number(budgetMonth), amount, notes: memo || undefined }]
          })
        });
      }
      if (active === "opening") {
        return api<OpeningBalanceBatchRow>("/accounting/opening-balances", {
          method: "POST",
          body: JSON.stringify({
            openingDate,
            notes: memo || undefined,
            lines: [
              { accountId: debitAccountId, debit: amount, credit: "0", description: memo || undefined },
              { accountId: creditAccountId, debit: "0", credit: amount, description: memo || undefined }
            ]
          })
        }).then((batch) => api(`/accounting/opening-balances/${batch.id}/post`, { method: "POST" }));
      }
      if (active === "yearend") {
        return api("/accounting/year-end-closes", {
          method: "POST",
          body: JSON.stringify({
            periodId: yearClosePeriodId,
            retainedEarningsAccountId: retainedEarningsAccountId || undefined,
            closingDate: endDate || undefined,
            notes: memo || undefined
          })
        });
      }
      return api("/accounting/supplier-payments", {
        method: "POST",
        body: JSON.stringify({ supplierInvoiceId, amount, method, reference: memo || undefined, notes: memo || undefined })
      });
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["accounting"] });
      await queryClient.invalidateQueries({ queryKey: ["purchase", "invoices"] });
    }
  });

  const tabs: Array<[typeof active, string, LucideIcon, string]> = [
    ["chart", "Chart", Database, "border-cyan-200 bg-cyan-50 text-cyan-700"],
    ["periods", "Periods", FileClock, "border-emerald-200 bg-emerald-50 text-emerald-700"],
    ["journals", "Journals", FileSpreadsheet, "border-indigo-200 bg-indigo-50 text-indigo-700"],
    ["posting", "Posting", Save, "border-pine/30 bg-pine/10 text-pine"],
    ["payables", "Payments", CircleDollarSign, "border-copper/30 bg-copper/10 text-copper"],
    ["reconcile", "Bank Rec", CheckCircle2, "border-emerald-200 bg-emerald-50 text-emerald-700"],
    ["recurring", "Recurring", FileClock, "border-indigo-200 bg-indigo-50 text-indigo-700"],
    ["budgets", "Budgets", Columns3, "border-cyan-200 bg-cyan-50 text-cyan-700"],
    ["opening", "Opening", Upload, "border-amber-200 bg-amber-50 text-amber-700"],
    ["yearend", "Year End", Moon, "border-plum/30 bg-plum/10 text-plum"],
    ["tax", "Tax", FileText, "border-amber-200 bg-amber-50 text-amber-700"],
    ["statements", "Statements", FileSpreadsheet, "border-slate-300 bg-slate-50 text-slate-700"],
    ["trial", "Trial Balance", Scale, "border-plum/30 bg-plum/10 text-plum"],
    ["ageing", "Ageing", FileText, "border-sky/30 bg-sky/10 text-sky"]
  ];
  const activeTab = tabs.find(([id]) => id === active);
  const ActiveIcon = activeTab?.[2] ?? CircleDollarSign;
  const selectedSupplierInvoice = (supplierInvoices.data ?? []).find((invoice) => invoice.id === supplierInvoiceId);
  const sourceDocuments = sourceType === "SALES_INVOICE"
    ? (salesInvoices.data ?? []).map((invoice) => ({ id: invoice.id, label: `${invoice.invoiceNo} - ${invoice.customer?.code ?? ""} - ${invoice.total ?? "0"}` }))
    : sourceType === "CUSTOMER_RECEIPT"
      ? (receipts.data ?? []).map((receipt) => ({ id: receipt.id, label: `${receipt.receiptNo} - ${receipt.customer?.code ?? ""} - ${receipt.amount ?? "0"}` }))
      : sourceType === "SUPPLIER_INVOICE"
        ? (supplierInvoices.data ?? []).map((invoice) => ({ id: invoice.id, label: `${invoice.invoiceNo} - ${invoice.supplier?.code ?? ""} - ${invoice.total ?? "0"}` }))
        : (supplierPayments.data ?? []).map((payment) => ({ id: payment.id, label: `${payment.paymentNo} - ${payment.supplier.code} - ${payment.amount}` }));

  function resetForm() {
    setAccountCode("");
    setAccountName("");
    setAccountType("ASSET");
    setPeriodCode("");
    setPeriodName("");
    setStartDate("");
    setEndDate("");
    setDebitAccountId("");
    setCreditAccountId("");
    setAmount("1");
    setMemo("");
    setSourceDocumentId("");
    setSupplierInvoiceId("");
    setMethod("BANK");
    setBankAccountId("");
    setStatementDate("");
    setStatementBalance("0");
    setRecurringCode("");
    setRecurringName("");
    setFrequency("MONTHLY");
    setNextRunDate("");
    setBudgetCode("");
    setBudgetName("");
    setBudgetPeriodId("");
    setBudgetMonth("1");
    setOpeningDate("");
    setYearClosePeriodId("");
    setRetainedEarningsAccountId("");
  }

  const accountRows = (accounts.data ?? []).map((account) => ({ id: account.id, code: account.code, name: account.name, type: account.type, normal: account.normalBalance, active: account.isActive }));
  const periodRows = (periods.data ?? []).map((period) => ({ id: period.id, code: period.code, name: period.name, start: new Date(period.startDate).toLocaleDateString(), end: new Date(period.endDate).toLocaleDateString(), status: period.status }));
  const journalRows = (journals.data ?? []).map((journal) => ({ id: journal.id, journalNo: journal.journalNo, date: new Date(journal.entryDate).toLocaleDateString(), source: journal.sourceType, memo: journal.memo ?? "-", debit: journal.totalDebit, credit: journal.totalCredit, status: journal.status }));
  const paymentRows = (supplierPayments.data ?? []).map((payment) => ({ id: payment.id, paymentNo: payment.paymentNo, supplier: payment.supplier.code, invoice: payment.supplierInvoice?.invoiceNo ?? "-", method: payment.method, amount: payment.amount, status: payment.status }));
  const reconciliationRows = (reconciliations.data ?? []).map((entry) => ({ id: entry.id, reconciliationNo: entry.reconciliationNo, bank: entry.bankAccount.code, statementDate: new Date(entry.statementDate).toLocaleDateString(), statementBalance: entry.statementBalance, bookBalance: entry.bookBalance, difference: entry.difference, lines: entry.lines?.length ?? 0, status: entry.status }));
  const recurringRows = (recurringJournals.data ?? []).map((entry) => ({ id: entry.id, code: entry.code, name: entry.name, frequency: entry.frequency, nextRun: new Date(entry.nextRunDate).toLocaleDateString(), lines: entry.lines.length, amount: entry.lines.reduce((sum, line) => sum + Number(line.debit), 0).toFixed(4), status: entry.status }));
  const budgetRows = (budgets.data ?? []).map((budget) => ({ id: budget.id, code: budget.code, name: budget.name, period: budget.period?.code ?? "-", lines: budget.lines.length, total: budget.lines.reduce((sum, line) => sum + Number(line.amount), 0).toFixed(4), status: budget.status }));
  const openingRows = (openingBalances.data ?? []).map((batch) => ({ id: batch.id, batchNo: batch.batchNo, openingDate: new Date(batch.openingDate).toLocaleDateString(), debit: batch.totalDebit, credit: batch.totalCredit, journal: batch.journalEntry?.journalNo ?? "-", lines: batch.lines.length, status: batch.status }));
  const yearEndRows = (yearEndCloses.data ?? []).map((entry) => ({ id: entry.id, closeNo: entry.closeNo, period: entry.period.code, closingDate: new Date(entry.closingDate).toLocaleDateString(), retainedEarnings: entry.retainedEarningsAccount.code, netIncome: entry.netIncome, journal: entry.journalEntry?.journalNo ?? "-", status: entry.status }));
  const taxRows = taxSummary.data?.rows ?? [];
  const balanceSheetRows = [
    ...(statements.data?.balanceSheet.assets ?? []),
    ...(statements.data?.balanceSheet.liabilities ?? []),
    ...(statements.data?.balanceSheet.equity ?? [])
  ].map((row) => ({ id: row.id, section: row.type, code: row.code, name: row.name, balance: row.balance }));
  const profitLossRows = [
    ...(statements.data?.profitAndLoss.revenue ?? []),
    ...(statements.data?.profitAndLoss.expenses ?? [])
  ].map((row) => ({ id: row.id, section: row.type, code: row.code, name: row.name, balance: row.balance }));
  const cashFlowRows = (statements.data?.cashFlow.rows ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name, movement: row.balance }));
  const trialRows = (trialBalance.data?.rows ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name, type: row.type, debit: row.debit, credit: row.credit, balance: row.balance }));
  const receivableRows = (ageing.data?.receivables ?? []).map((row) => ({ id: row.id, documentNo: row.documentNo, customer: row.party, bucket: row.bucket, outstanding: row.outstanding, status: row.status }));
  const payableRows = (ageing.data?.payables ?? []).map((row) => ({ id: row.id, documentNo: row.documentNo, supplierInvoiceNo: row.supplierInvoiceNo ?? "-", supplier: row.party, bucket: row.bucket, outstanding: row.outstanding, status: row.status }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-5 xl:grid-cols-7">
        {tabs.map(([id, label, Icon, tone]) => (
          <button
            key={id}
            type="button"
            className={`focus-ring inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium shadow-sm ${active === id ? tone : "border-line bg-white text-slate-700 hover:bg-slate-50"}`}
            onClick={() => {
              setActive(id);
              resetForm();
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {active === "chart" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-white px-4 py-3 shadow-sm">
          <div>
            <div className="font-semibold">Accounting Defaults</div>
            <div className="text-xs text-slate-500">Creates the demo chart of accounts and current open financial period.</div>
          </div>
          <button type="button" className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244]" onClick={() => setupDefaults.mutate()} disabled={setupDefaults.isPending}>
            <Save className="h-4 w-4" />
            {setupDefaults.isPending ? "Setting up..." : "Setup Defaults"}
          </button>
        </div>
      ) : null}

      {active === "chart" || active === "periods" || active === "journals" || active === "posting" || active === "payables" || active === "reconcile" || active === "recurring" || active === "budgets" || active === "opening" || active === "yearend" ? (
        <form
          className="rounded border border-line bg-white shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-3">
            <div className={`grid h-9 w-9 place-items-center rounded ring-1 ${activeTab?.[3] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">{active === "posting" ? "Post Source Document" : active === "payables" ? "Supplier Payment" : active === "reconcile" ? "Bank Reconciliation" : active === "opening" ? "Post Opening Balance" : active === "yearend" ? "Run Year-End Close" : `Create ${activeTab?.[1]}`}</div>
              <div className="text-xs text-slate-500">Journal entries are posted only when debits equal credits and the period is open.</div>
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-6">
            {active === "chart" ? (
              <>
                <label className="text-sm">
                  Code
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={accountCode} onChange={(event) => setAccountCode(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-2">
                  Name
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={accountName} onChange={(event) => setAccountName(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Type
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={accountType} onChange={(event) => setAccountType(event.target.value)}>
                    {["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
              </>
            ) : null}

            {active === "periods" ? (
              <>
                <label className="text-sm">
                  Code
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={periodCode} onChange={(event) => setPeriodCode(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-2">
                  Name
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={periodName} onChange={(event) => setPeriodName(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Start
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
                </label>
                <label className="text-sm">
                  End
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
                </label>
              </>
            ) : null}

            {active === "journals" ? (
              <>
                <AccountSelect accounts={accounts.data ?? []} label="Debit account" value={debitAccountId} onChange={setDebitAccountId} />
                <AccountSelect accounts={accounts.data ?? []} label="Credit account" value={creditAccountId} onChange={setCreditAccountId} />
                <label className="text-sm">
                  Amount
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={amount} onChange={(event) => setAmount(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-3">
                  Memo
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={memo} onChange={(event) => setMemo(event.target.value)} />
                </label>
              </>
            ) : null}

            {active === "posting" ? (
              <>
                <label className="text-sm">
                  Source
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={sourceType} onChange={(event) => { setSourceType(event.target.value); setSourceDocumentId(""); }}>
                    <option value="SALES_INVOICE">Sales invoice</option>
                    <option value="CUSTOMER_RECEIPT">Customer receipt</option>
                    <option value="SUPPLIER_INVOICE">Supplier invoice</option>
                    <option value="SUPPLIER_PAYMENT">Supplier payment</option>
                  </select>
                </label>
                <label className="text-sm md:col-span-3">
                  Document
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={sourceDocumentId} onChange={(event) => setSourceDocumentId(event.target.value)} required>
                    <option value="">Select document</option>
                    {sourceDocuments.map((document) => <option key={document.id} value={document.id}>{document.label}</option>)}
                  </select>
                </label>
              </>
            ) : null}

            {active === "payables" ? (
              <>
                <label className="text-sm md:col-span-3">
                  Supplier invoice
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={supplierInvoiceId} onChange={(event) => {
                    setSupplierInvoiceId(event.target.value);
                    const invoice = (supplierInvoices.data ?? []).find((entry) => entry.id === event.target.value);
                    if (invoice) setAmount(String(Number(invoice.total ?? "0") - Number(invoice.paidAmount ?? "0")));
                  }} required>
                    <option value="">Select invoice</option>
                    {(supplierInvoices.data ?? []).map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>{invoice.invoiceNo} - {invoice.supplier?.code} - outstanding {Number(invoice.total ?? "0") - Number(invoice.paidAmount ?? "0")}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Amount
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={amount} onChange={(event) => setAmount(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Method
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={method} onChange={(event) => setMethod(event.target.value)}>
                    <option value="BANK">Bank</option>
                    <option value="CASH">Cash</option>
                  </select>
                </label>
                <label className="text-sm">
                  Reference
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={memo} onChange={(event) => setMemo(event.target.value)} placeholder={selectedSupplierInvoice?.supplierInvoiceNo ?? ""} />
                </label>
              </>
            ) : null}

            {active === "reconcile" ? (
              <>
                <label className="text-sm md:col-span-2">
                  Bank account
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)}>
                    <option value="">Default bank</option>
                    {(accounts.data ?? []).filter((account) => account.isCash).map((account) => (
                      <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Statement date
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={statementDate} onChange={(event) => setStatementDate(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Statement balance
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={statementBalance} onChange={(event) => setStatementBalance(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-2">
                  Notes
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={memo} onChange={(event) => setMemo(event.target.value)} />
                </label>
              </>
            ) : null}

            {active === "recurring" ? (
              <>
                <label className="text-sm">
                  Code
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={recurringCode} onChange={(event) => setRecurringCode(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-2">
                  Name
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={recurringName} onChange={(event) => setRecurringName(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Frequency
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={frequency} onChange={(event) => setFrequency(event.target.value)}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </label>
                <label className="text-sm">
                  Next run
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={nextRunDate} onChange={(event) => setNextRunDate(event.target.value)} required />
                </label>
                <AccountSelect accounts={accounts.data ?? []} label="Debit account" value={debitAccountId} onChange={setDebitAccountId} />
                <AccountSelect accounts={accounts.data ?? []} label="Credit account" value={creditAccountId} onChange={setCreditAccountId} />
                <label className="text-sm">
                  Amount
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={amount} onChange={(event) => setAmount(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-3">
                  Memo
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={memo} onChange={(event) => setMemo(event.target.value)} />
                </label>
              </>
            ) : null}

            {active === "budgets" ? (
              <>
                <label className="text-sm">
                  Code
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={budgetCode} onChange={(event) => setBudgetCode(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-2">
                  Name
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={budgetName} onChange={(event) => setBudgetName(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Period
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={budgetPeriodId} onChange={(event) => setBudgetPeriodId(event.target.value)}>
                    <option value="">No period</option>
                    {(periods.data ?? []).map((period) => <option key={period.id} value={period.id}>{period.code} - {period.status}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  Month
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={budgetMonth} onChange={(event) => setBudgetMonth(event.target.value)}>
                    {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => <option key={month} value={month}>{month}</option>)}
                  </select>
                </label>
                <AccountSelect accounts={accounts.data ?? []} label="Budget account" value={debitAccountId} onChange={setDebitAccountId} />
                <label className="text-sm">
                  Amount
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={amount} onChange={(event) => setAmount(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-3">
                  Notes
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={memo} onChange={(event) => setMemo(event.target.value)} />
                </label>
              </>
            ) : null}

            {active === "opening" ? (
              <>
                <label className="text-sm">
                  Opening date
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={openingDate} onChange={(event) => setOpeningDate(event.target.value)} required />
                </label>
                <AccountSelect accounts={accounts.data ?? []} label="Debit account" value={debitAccountId} onChange={setDebitAccountId} />
                <AccountSelect accounts={accounts.data ?? []} label="Credit account" value={creditAccountId} onChange={setCreditAccountId} />
                <label className="text-sm">
                  Amount
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={amount} onChange={(event) => setAmount(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-3">
                  Notes
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={memo} onChange={(event) => setMemo(event.target.value)} />
                </label>
              </>
            ) : null}

            {active === "yearend" ? (
              <>
                <label className="text-sm md:col-span-2">
                  Period
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={yearClosePeriodId} onChange={(event) => {
                    setYearClosePeriodId(event.target.value);
                    const period = (periods.data ?? []).find((entry) => entry.id === event.target.value);
                    setEndDate(period ? period.endDate.slice(0, 10) : "");
                  }} required>
                    <option value="">Select period</option>
                    {(periods.data ?? []).map((period) => <option key={period.id} value={period.id}>{period.code} - {period.status}</option>)}
                  </select>
                </label>
                <label className="text-sm md:col-span-2">
                  Retained earnings
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={retainedEarningsAccountId} onChange={(event) => setRetainedEarningsAccountId(event.target.value)}>
                    <option value="">Default 3000</option>
                    {(accounts.data ?? []).filter((account) => account.type === "EQUITY").map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  Closing date
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </label>
                <label className="text-sm md:col-span-3">
                  Notes
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={memo} onChange={(event) => setMemo(event.target.value)} />
                </label>
              </>
            ) : null}
          </div>

          {save.error ? <div className="mx-4 mb-3 text-sm text-red-700">{save.error.message}</div> : null}
          {setupDefaults.error ? <div className="mx-4 mb-3 text-sm text-red-700">{setupDefaults.error.message}</div> : null}
          <div className="flex justify-end border-t border-line px-4 py-3">
            <button className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50" disabled={save.isPending}>
              <Save className="h-4 w-4" />
              {save.isPending ? "Saving..." : active === "posting" ? "Post" : active === "reconcile" ? "Reconcile" : active === "opening" ? "Post Opening Balance" : active === "yearend" ? "Close Year" : "Save"}
            </button>
          </div>
        </form>
      ) : null}

      {active === "chart" ? <DataTable rows={accountRows} columns={["code", "name", "type", "normal", "active"]} title="Chart of Accounts" /> : null}
      {active === "periods" ? <DataTable rows={periodRows} columns={["code", "name", "start", "end", "status"]} title="Financial Periods" /> : null}
      {active === "journals" || active === "posting" ? <DataTable rows={journalRows} columns={["journalNo", "date", "source", "memo", "debit", "credit", "status"]} title="General Ledger Journals" /> : null}
      {active === "payables" ? <DataTable rows={paymentRows} columns={["paymentNo", "supplier", "invoice", "method", "amount", "status"]} title="Supplier Payments" /> : null}
      {active === "reconcile" ? <DataTable rows={reconciliationRows} columns={["reconciliationNo", "bank", "statementDate", "statementBalance", "bookBalance", "difference", "lines", "status"]} title="Bank Reconciliations" /> : null}
      {active === "recurring" ? <DataTable rows={recurringRows} columns={["code", "name", "frequency", "nextRun", "lines", "amount", "status"]} title="Recurring Journals" /> : null}
      {active === "budgets" ? <DataTable rows={budgetRows} columns={["code", "name", "period", "lines", "total", "status"]} title="Budgets" /> : null}
      {active === "opening" ? <DataTable rows={openingRows} columns={["batchNo", "openingDate", "debit", "credit", "journal", "lines", "status"]} title="Opening Balances" /> : null}
      {active === "yearend" ? <DataTable rows={yearEndRows} columns={["closeNo", "period", "closingDate", "retainedEarnings", "netIncome", "journal", "status"]} title="Year-End Closes" /> : null}
      {active === "tax" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded border border-line bg-white px-4 py-3 shadow-sm"><div className="text-xs uppercase text-slate-500">Input tax</div><div className="mt-1 text-2xl font-semibold">{taxSummary.data?.inputTax ?? "0"}</div></div>
            <div className="rounded border border-line bg-white px-4 py-3 shadow-sm"><div className="text-xs uppercase text-slate-500">Output tax</div><div className="mt-1 text-2xl font-semibold">{taxSummary.data?.outputTax ?? "0"}</div></div>
            <div className="rounded border border-line bg-white px-4 py-3 shadow-sm"><div className="text-xs uppercase text-slate-500">Net tax payable</div><div className="mt-1 text-2xl font-semibold">{taxSummary.data?.netTaxPayable ?? "0"}</div></div>
          </div>
          <DataTable rows={taxRows} columns={["account", "name", "amount", "direction"]} title="Tax Summary" />
        </div>
      ) : null}
      {active === "statements" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded border border-line bg-white px-4 py-3 shadow-sm"><div className="text-xs uppercase text-slate-500">Total assets</div><div className="mt-1 text-2xl font-semibold">{statements.data?.balanceSheet.totalAssets ?? "0"}</div></div>
            <div className="rounded border border-line bg-white px-4 py-3 shadow-sm"><div className="text-xs uppercase text-slate-500">Net income</div><div className="mt-1 text-2xl font-semibold">{statements.data?.profitAndLoss.netIncome ?? "0"}</div></div>
            <div className="rounded border border-line bg-white px-4 py-3 shadow-sm"><div className="text-xs uppercase text-slate-500">Closing cash</div><div className="mt-1 text-2xl font-semibold">{statements.data?.cashFlow.closingCash ?? "0"}</div></div>
          </div>
          <DataTable rows={balanceSheetRows} columns={["section", "code", "name", "balance"]} title="Balance Sheet" />
          <DataTable rows={profitLossRows} columns={["section", "code", "name", "balance"]} title="Profit and Loss" />
          <DataTable rows={cashFlowRows} columns={["code", "name", "movement"]} title="Cash Flow" />
        </div>
      ) : null}
      {active === "trial" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border border-line bg-white px-4 py-3 shadow-sm"><div className="text-xs uppercase text-slate-500">Total debit</div><div className="mt-1 text-2xl font-semibold">{trialBalance.data?.totalDebit ?? "0"}</div></div>
            <div className="rounded border border-line bg-white px-4 py-3 shadow-sm"><div className="text-xs uppercase text-slate-500">Total credit</div><div className="mt-1 text-2xl font-semibold">{trialBalance.data?.totalCredit ?? "0"}</div></div>
          </div>
          <DataTable rows={trialRows} columns={["code", "name", "type", "debit", "credit", "balance"]} title="Trial Balance" />
        </div>
      ) : null}
      {active === "ageing" ? (
        <div className="space-y-4">
          <DataTable rows={receivableRows} columns={["documentNo", "customer", "bucket", "outstanding", "status"]} title="Receivables Ageing" />
          <DataTable rows={payableRows} columns={["documentNo", "supplierInvoiceNo", "supplier", "bucket", "outstanding", "status"]} title="Payables Ageing" />
        </div>
      ) : null}
    </div>
  );
}

function AccountSelect({ accounts, label, value, onChange }: { accounts: AccountRow[]; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm md:col-span-2">
      {label}
      <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select account</option>
        {accounts.filter((account) => account.isActive).map((account) => (
          <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
        ))}
      </select>
    </label>
  );
}

function InventoryView() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<"transfers" | "counts" | "adjustments" | "valuation" | "ledger">("transfers");
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Array<Record<string, string>>>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importPreview, setImportPreview] = useState<InventoryImportPreview | null>(null);
  const [importError, setImportError] = useState("");

  const items = useQuery({ queryKey: ["master-data", "items"], queryFn: () => api<ItemRow[]>("/master-data/items") });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: () => api<OrgUnit[]>("/warehouses") });
  const transfers = useQuery({ queryKey: ["inventory", "transfers"], queryFn: () => api<StockTransferRow[]>("/inventory/transfers") });
  const counts = useQuery({ queryKey: ["inventory", "counts"], queryFn: () => api<StockCountRow[]>("/inventory/counts") });
  const adjustments = useQuery({ queryKey: ["inventory", "adjustments"], queryFn: () => api<StockAdjustmentRow[]>("/inventory/adjustments") });
  const valuation = useQuery({ queryKey: ["inventory", "valuation"], queryFn: () => api<InventoryValuation>("/inventory/valuation") });
  const ledger = useQuery({ queryKey: ["inventory", "ledger"], queryFn: () => api<StockLedgerRow[]>("/inventory/ledger") });
  const stockBalances = useQuery({ queryKey: ["inventory", "stock-balances"], queryFn: () => api<StockBalanceRow[]>("/inventory/stock-balances") });

  const save = useMutation({
    mutationFn: () => {
      if (active === "transfers") {
        return api("/inventory/transfers", {
          method: "POST",
          body: JSON.stringify({ itemId, fromWarehouseId: warehouseId, toWarehouseId, quantity, remarks: remarks || undefined })
        });
      }

      if (active === "counts") {
        return api("/inventory/counts", {
          method: "POST",
          body: JSON.stringify({ warehouseId, remarks: remarks || undefined, lines: [{ itemId, countedQuantity: quantity, remarks: remarks || undefined }] })
        });
      }

      return api("/inventory/adjustments", {
        method: "POST",
        body: JSON.stringify({
          warehouseId,
          reason: reason || "Manual adjustment",
          remarks: remarks || undefined,
          lines: [{ itemId, movementType, quantity, unitCost: unitCost || undefined, remarks: remarks || undefined }]
        })
      });
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
    }
  });
  const importTarget: InventoryImportTarget = active === "transfers" || active === "counts" || active === "adjustments" ? active : "adjustments";
  const importFields = inventoryImportFields(importTarget);

  const previewImport = useMutation({
    mutationFn: () =>
      api<InventoryImportPreview>("/inventory/import/preview", {
        method: "POST",
        body: JSON.stringify({ target: importTarget, rows: importRows, mapping: importMapping })
      }),
    onSuccess: (preview) => setImportPreview(preview)
  });

  const commitImport = useMutation({
    mutationFn: () =>
      api<InventoryImportPreview>("/inventory/import/commit", {
        method: "POST",
        body: JSON.stringify({ target: importTarget, rows: importRows, mapping: importMapping })
      }),
    onSuccess: async (preview) => {
      setImportPreview(preview);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
    }
  });

  const tabs: Array<[typeof active, string, LucideIcon, string]> = [
    ["transfers", "Transfers", ArrowRightLeft, "border-cyan-200 bg-cyan-50 text-cyan-700"],
    ["counts", "Counts", ClipboardList, "border-emerald-200 bg-emerald-50 text-emerald-700"],
    ["adjustments", "Adjustments", Scale, "border-copper/30 bg-copper/10 text-copper"],
    ["valuation", "Valuation", CircleDollarSign, "border-indigo-200 bg-indigo-50 text-indigo-700"],
    ["ledger", "Ledger", FileSpreadsheet, "border-plum/30 bg-plum/10 text-plum"]
  ];
  const activeTab = tabs.find(([id]) => id === active);
  const ActiveIcon = activeTab?.[2] ?? Warehouse;
  const stockItems = (items.data ?? []).filter((item) => item.isActive && ["stock", "consumable"].includes(String(item.itemType).toLowerCase()));
  const activeWarehouses = (warehouses.data ?? []).filter((warehouse) => warehouse.isActive);
  const selectedBalance = (stockBalances.data ?? []).find((balance) => balance.item.id === itemId && balance.warehouse.id === warehouseId);

  function resetForm() {
    setItemId("");
    setWarehouseId("");
    setToWarehouseId("");
    setMovementType("IN");
    setQuantity("1");
    setUnitCost("");
    setReason("");
    setRemarks("");
  }

  function resetImportState() {
    setImportFileName("");
    setImportHeaders([]);
    setImportRows([]);
    setImportMapping({});
    setImportPreview(null);
    setImportError("");
  }

  async function loadInventoryImportFile(file: File | null) {
    if (!file) return;
    try {
      const parsed = await parseSpreadsheetFile(file);
      setImportFileName(file.name);
      setImportHeaders(parsed.headers);
      setImportRows(parsed.rows);
      setImportMapping(defaultImportMapping(importFields, parsed.headers));
      setImportPreview(null);
      setImportError("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to read import file");
    }
  }

  const transferRows = (transfers.data ?? []).map((transfer) => ({
    id: transfer.id,
    transferNo: transfer.transferNo,
    item: transfer.item.code,
    from: transfer.fromWarehouse.code,
    to: transfer.toWarehouse.code,
    quantity: transfer.quantity,
    value: transfer.valuationAmount,
    status: transfer.status
  }));
  const countRows = (counts.data ?? []).map((count) => ({
    id: count.id,
    countNo: count.countNo,
    warehouse: count.warehouse.code,
    status: count.status,
    lines: count.lines.length,
    variance: count.lines.reduce((sum, line) => sum + Number(line.varianceQuantity), 0).toFixed(4),
    value: count.lines.reduce((sum, line) => sum + Number(line.valuationAmount), 0).toFixed(4)
  }));
  const adjustmentRows = (adjustments.data ?? []).map((adjustment) => ({
    id: adjustment.id,
    adjustmentNo: adjustment.adjustmentNo,
    warehouse: adjustment.warehouse.code,
    reason: adjustment.reason,
    status: adjustment.status,
    lines: adjustment.lines.length,
    value: adjustment.lines.reduce((sum, line) => sum + Number(line.valuationAmount), 0).toFixed(4)
  }));
  const valuationRows = (valuation.data?.rows ?? []).map((row) => ({
    id: row.id,
    item: row.item.code,
    warehouse: row.warehouse.code,
    onHand: row.quantityOnHand,
    averageCost: row.averageCost,
    value: row.valuationAmount
  }));
  const ledgerRows = (ledger.data ?? []).map((entry) => ({
    id: entry.id,
    postedAt: new Date(entry.postedAt).toLocaleString(),
    source: `${entry.sourceType} ${entry.sourceDocumentId}`,
    movement: entry.movementType,
    item: entry.item.code,
    warehouse: entry.warehouse.code,
    in: entry.quantityIn,
    out: entry.quantityOut,
    unitCost: entry.unitCost,
    balanceAfter: entry.balanceAfter
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-5">
        {tabs.map(([id, label, Icon, tone]) => (
          <button
            key={id}
            type="button"
            className={`focus-ring inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium shadow-sm ${active === id ? tone : "border-line bg-white text-slate-700 hover:bg-slate-50"}`}
            onClick={() => {
              setActive(id);
              resetForm();
              resetImportState();
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {active === "transfers" || active === "counts" || active === "adjustments" ? (
        <section className="rounded border border-line bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">Bulk Excel Import</div>
                <div className="text-xs text-slate-500">{importFileName || `Upload ${activeTab?.[1].toLowerCase()} rows from Excel`}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                onClick={() => void downloadInventoryExcelTemplate(importTarget)}
              >
                <Download className="h-4 w-4" />
                Excel Template
              </button>
              <label className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
                <Upload className="h-4 w-4" />
                Upload Excel
                <input
                  className="sr-only"
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={(event) => void loadInventoryImportFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div className="space-y-4 p-4">
            {importHeaders.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
                {importFields.map((field) => (
                  <label key={field} className="text-sm">
                    {formatColumn(field)}
                    <select
                      className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2"
                      value={importMapping[field] ?? ""}
                      onChange={(event) => {
                        setImportMapping((current) => ({ ...current, [field]: event.target.value }));
                        setImportPreview(null);
                      }}
                    >
                      <option value="">Not mapped</option>
                      {importHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                {importRows.length > 0 ? `${importRows.length} source rows loaded` : "Upload an Excel workbook or CSV to start"}
                {importPreview ? ` - ${importPreview.validRows} valid, ${importPreview.invalidRows} with errors` : ""}
                {importPreview?.importedRows !== undefined ? ` - ${importPreview.importedRows} imported` : ""}
              </div>
              <div className="flex flex-wrap gap-2">
                {importPreview && importPreview.invalidRows > 0 ? (
                  <button
                    type="button"
                    className="focus-ring inline-flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100"
                    onClick={() => downloadInventoryImportErrors(importPreview)}
                  >
                    <Download className="h-4 w-4" />
                    Error Report
                  </button>
                ) : null}
                <button
                  type="button"
                  className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                  disabled={importRows.length === 0 || previewImport.isPending}
                  onClick={() => previewImport.mutate()}
                >
                  <Search className="h-4 w-4" />
                  {previewImport.isPending ? "Validating..." : "Preview"}
                </button>
                <button
                  type="button"
                  className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50"
                  disabled={!importPreview || importPreview.validRows === 0 || importPreview.importedRows !== undefined || commitImport.isPending}
                  onClick={() => commitImport.mutate()}
                >
                  <Save className="h-4 w-4" />
                  {commitImport.isPending ? "Importing..." : importPreview?.importedRows !== undefined ? "Imported" : "Confirm Import"}
                </button>
              </div>
            </div>

            {importError ? <div className="text-sm text-red-700">{importError}</div> : null}
            {previewImport.error ? <div className="text-sm text-red-700">{previewImport.error.message}</div> : null}
            {commitImport.error ? <div className="text-sm text-red-700">{commitImport.error.message}</div> : null}
            {importPreview ? (
              <DataTable
                rows={inventoryImportPreviewRows(importPreview)}
                columns={inventoryImportPreviewColumns(importTarget)}
                title="Import Preview"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {active === "transfers" || active === "counts" || active === "adjustments" ? (
        <form
          className="rounded border border-line bg-white shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-3">
            <div className={`grid h-9 w-9 place-items-center rounded ring-1 ${activeTab?.[3] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">Post {activeTab?.[1]}</div>
              <div className="text-xs text-slate-500">
                {selectedBalance ? `Current balance ${selectedBalance.quantityOnHand} at ${selectedBalance.warehouse.code}` : "Posts update stock balances and immutable ledger entries."}
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-6">
            <ItemSelect items={stockItems} value={itemId} onChange={setItemId} />
            <label className="text-sm">
              {active === "transfers" ? "From warehouse" : "Warehouse"}
              <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} required>
                <option value="">Select warehouse</option>
                {activeWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </option>
                ))}
              </select>
            </label>
            {active === "transfers" ? (
              <label className="text-sm">
                To warehouse
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={toWarehouseId} onChange={(event) => setToWarehouseId(event.target.value)} required>
                  <option value="">Select warehouse</option>
                  {activeWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {active === "adjustments" ? (
              <label className="text-sm">
                Direction
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={movementType} onChange={(event) => setMovementType(event.target.value as "IN" | "OUT")}>
                  <option value="IN">Stock In</option>
                  <option value="OUT">Stock Out</option>
                </select>
              </label>
            ) : null}
            <label className="text-sm">
              {active === "counts" ? "Counted quantity" : "Quantity"}
              <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </label>
            {active === "adjustments" ? (
              <>
                <label className="text-sm">
                  Unit cost
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} placeholder="Average cost" />
                </label>
                <label className="text-sm md:col-span-2">
                  Reason
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={reason} onChange={(event) => setReason(event.target.value)} required />
                </label>
              </>
            ) : null}
            <label className="text-sm md:col-span-3">
              Remarks
              <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
            </label>
          </div>

          {save.error ? <div className="mx-4 mb-3 text-sm text-red-700">{save.error.message}</div> : null}
          <div className="flex justify-end border-t border-line px-4 py-3">
            <button className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50" disabled={save.isPending}>
              <Save className="h-4 w-4" />
              {save.isPending ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      ) : null}

      {active === "valuation" ? (
        <div className="rounded border border-line bg-white px-4 py-3 shadow-sm">
          <div className="text-xs uppercase text-slate-500">Total inventory value</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{valuation.data?.totalValue ?? "0"}</div>
        </div>
      ) : null}

      {active === "transfers" ? <DataTable rows={transferRows} columns={["transferNo", "item", "from", "to", "quantity", "value", "status"]} title="Stock Transfers" /> : null}
      {active === "counts" ? <DataTable rows={countRows} columns={["countNo", "warehouse", "status", "lines", "variance", "value"]} title="Stock Counts" /> : null}
      {active === "adjustments" ? <DataTable rows={adjustmentRows} columns={["adjustmentNo", "warehouse", "reason", "status", "lines", "value"]} title="Stock Adjustments" /> : null}
      {active === "valuation" ? <DataTable rows={valuationRows} columns={["item", "warehouse", "onHand", "averageCost", "value"]} title="Inventory Valuation" /> : null}
      {active === "ledger" ? <DataTable rows={ledgerRows} columns={["postedAt", "source", "movement", "item", "warehouse", "in", "out", "unitCost", "balanceAfter"]} title="Stock Ledger" /> : null}
    </div>
  );
}

function PurchaseView() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<"requests" | "rfqs" | "quotes" | "orders" | "receipts" | "invoices" | "returns">("requests");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseRequestId, setPurchaseRequestId] = useState("");
  const [rfqId, setRfqId] = useState("");
  const [supplierQuotationId, setSupplierQuotationId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [purchaseOrderLineId, setPurchaseOrderLineId] = useState("");
  const [goodsReceiptId, setGoodsReceiptId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [requiredDate, setRequiredDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const suppliers = useQuery({ queryKey: ["master-data", "suppliers"], queryFn: () => api<SupplierRow[]>("/master-data/suppliers") });
  const items = useQuery({ queryKey: ["master-data", "items"], queryFn: () => api<ItemRow[]>("/master-data/items") });
  const requests = useQuery({ queryKey: ["purchase", "requests"], queryFn: () => api<PurchaseDocumentRow[]>("/purchase/requests") });
  const rfqs = useQuery({ queryKey: ["purchase", "rfqs"], queryFn: () => api<PurchaseDocumentRow[]>("/purchase/rfqs") });
  const quotes = useQuery({ queryKey: ["purchase", "supplier-quotations"], queryFn: () => api<PurchaseDocumentRow[]>("/purchase/supplier-quotations") });
  const orders = useQuery({ queryKey: ["purchase", "orders"], queryFn: () => api<PurchaseDocumentRow[]>("/purchase/orders") });
  const receipts = useQuery({ queryKey: ["purchase", "receipts"], queryFn: () => api<PurchaseDocumentRow[]>("/purchase/receipts") });
  const invoices = useQuery({ queryKey: ["purchase", "invoices"], queryFn: () => api<PurchaseDocumentRow[]>("/purchase/invoices") });
  const returns = useQuery({ queryKey: ["purchase", "returns"], queryFn: () => api<PurchaseDocumentRow[]>("/purchase/returns") });
  const comparison = useQuery({
    queryKey: ["purchase", "rfq-comparison", rfqId],
    queryFn: () => api<RfqComparison>(`/purchase/rfqs/${rfqId}/comparison`),
    enabled: Boolean(rfqId)
  });

  const selectedItem = items.data?.find((item) => item.id === itemId);
  const selectedOrder = orders.data?.find((order) => order.id === purchaseOrderId);
  const selectedOrderLine = selectedOrder?.lines?.find((line) => line.id === purchaseOrderLineId);

  useEffect(() => {
    if (!selectedOrder || !["receipts", "returns"].includes(active)) return;
    const firstOpenLine = selectedOrder.lines?.find((line) => Number(line.quantity) - Number(line.receivedQuantity ?? "0") > 0) ?? selectedOrder.lines?.[0];
    setPurchaseOrderLineId(firstOpenLine?.id ?? "");
  }, [active, selectedOrder?.id, selectedOrder?.lines]);

  const save = useMutation({
    mutationFn: () => {
      if (active === "requests") {
        return api("/purchase/requests", {
          method: "POST",
          body: JSON.stringify({ requiredDate: requiredDate || undefined, notes: notes || undefined, lines: [purchaseLinePayload()] })
        });
      }

      if (active === "rfqs") {
        return api("/purchase/rfqs", {
          method: "POST",
          body: JSON.stringify({ purchaseRequestId: purchaseRequestId || undefined, dueDate: requiredDate || undefined, notes: notes || undefined })
        });
      }

      if (active === "quotes") {
        return api("/purchase/supplier-quotations", {
          method: "POST",
          body: JSON.stringify({ rfqId: rfqId || undefined, supplierId, leadTimeDays: reference || undefined, notes: notes || undefined, lines: [purchaseLinePayload()] })
        });
      }

      if (active === "orders") {
        return api("/purchase/orders", {
          method: "POST",
          body: JSON.stringify({
            supplierId,
            purchaseRequestId: purchaseRequestId || undefined,
            supplierQuotationId: supplierQuotationId || undefined,
            expectedDate: requiredDate || undefined,
            notes: notes || undefined,
            lines: supplierQuotationId ? undefined : [purchaseLinePayload()]
          })
        });
      }

      if (active === "receipts") {
        return api("/purchase/receipts", {
          method: "POST",
          body: JSON.stringify({ purchaseOrderId, notes: notes || undefined, lines: purchaseOrderLineId ? [{ purchaseOrderLineId, quantity }] : undefined })
        });
      }

      if (active === "invoices") {
        const subtotal = unitPrice || selectedOrder?.total || "0";
        return api("/purchase/invoices", {
          method: "POST",
          body: JSON.stringify({ purchaseOrderId, goodsReceiptId: goodsReceiptId || undefined, supplierInvoiceNo: reference || `SUP-${Date.now()}`, subtotal, taxTotal: taxRate || "0", notes: notes || undefined })
        });
      }

      return api("/purchase/returns", {
        method: "POST",
        body: JSON.stringify({ purchaseOrderId, reason: reference || undefined, notes: notes || undefined, lines: purchaseOrderLineId ? [{ purchaseOrderLineId, quantity }] : [] })
      });
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["purchase"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
    }
  });

  const tabs: Array<[typeof active, string, LucideIcon, string]> = [
    ["requests", "Requests", FileClock, "border-sky/30 bg-sky/10 text-sky"],
    ["rfqs", "RFQs", FileText, "border-cyan-200 bg-cyan-50 text-cyan-700"],
    ["quotes", "Supplier Quotes", CircleDollarSign, "border-emerald-200 bg-emerald-50 text-emerald-700"],
    ["orders", "Purchase Orders", ClipboardList, "border-copper/30 bg-copper/10 text-copper"],
    ["receipts", "Goods Receipts", Boxes, "border-pine/30 bg-pine/10 text-pine"],
    ["invoices", "Supplier Invoices", FileSpreadsheet, "border-indigo-200 bg-indigo-50 text-indigo-700"],
    ["returns", "Purchase Returns", Truck, "border-plum/30 bg-plum/10 text-plum"]
  ];
  const activeTab = tabs.find(([id]) => id === active);
  const ActiveIcon = activeTab?.[2] ?? ShoppingCart;

  function purchaseLinePayload() {
    return {
      itemId,
      description: selectedItem ? `${selectedItem.code} - ${selectedItem.name}` : "Purchase item",
      quantity,
      unitPrice,
      taxRate
    };
  }

  function resetForm() {
    setSupplierId("");
    setPurchaseRequestId("");
    setRfqId("");
    setSupplierQuotationId("");
    setPurchaseOrderId("");
    setPurchaseOrderLineId("");
    setGoodsReceiptId("");
    setItemId("");
    setQuantity("1");
    setUnitPrice("0");
    setTaxRate("0");
    setRequiredDate("");
    setReference("");
    setNotes("");
  }

  const requestRows = (requests.data ?? []).map((request) => ({ id: request.id, requestNo: request.requestNo ?? "-", status: request.status, lines: request.lines?.length ?? 0 }));
  const rfqRows = (rfqs.data ?? []).map((rfq) => ({ id: rfq.id, rfqNo: rfq.rfqNo ?? "-", request: rfq.purchaseRequest?.requestNo ?? "-", status: rfq.status, quotes: rfq.supplierQuotations?.length ?? 0, bestTotal: bestQuoteTotal(rfq) }));
  const quoteRows = (quotes.data ?? []).map((quote) => ({ id: quote.id, quoteNo: quote.quoteNo ?? "-", rfq: quote.purchaseRequest?.requestNo ?? quote.supplier?.code ?? "-", supplier: quote.supplier?.code ?? "-", status: quote.status, total: quote.total ?? "0" }));
  const orderRows = (orders.data ?? []).map((order) => ({ id: order.id, poNo: order.poNo ?? "-", supplier: order.supplier?.code ?? "-", status: order.status, ordered: order.lines?.reduce((sum, line) => sum + Number(line.quantity), 0).toFixed(4) ?? "0", received: order.lines?.reduce((sum, line) => sum + Number(line.receivedQuantity ?? "0"), 0).toFixed(4) ?? "0", total: order.total ?? "0" }));
  const receiptRows = (receipts.data ?? []).map((receipt) => ({ id: receipt.id, receiptNo: receipt.receiptNo ?? "-", order: receipt.purchaseOrder?.poNo ?? "-", status: receipt.status, lines: receipt.lines?.length ?? 0 }));
  const invoiceRows = (invoices.data ?? []).map((invoice) => ({ id: invoice.id, invoiceNo: invoice.invoiceNo ?? "-", supplierInvoiceNo: invoice.supplierInvoiceNo ?? "-", order: invoice.purchaseOrder?.poNo ?? "-", receipt: invoice.goodsReceipt?.receiptNo ?? "-", matchingStatus: invoice.matchingStatus ?? "-", status: invoice.status, total: invoice.total ?? "0" }));
  const returnRows = (returns.data ?? []).map((entry) => ({ id: entry.id, returnNo: entry.returnNo ?? "-", order: entry.purchaseOrder?.poNo ?? "-", supplier: entry.supplier?.code ?? "-", status: entry.status, lines: entry.lines?.length ?? 0 }));
  const comparisonRows = (comparison.data?.quotations ?? []).map((quote) => ({ id: quote.quoteNo, quoteNo: quote.quoteNo, supplier: quote.supplier?.code ?? "-", total: quote.total, leadTimeDays: quote.leadTimeDays ?? "-" }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-7">
        {tabs.map(([id, label, Icon, tone]) => (
          <button
            key={id}
            type="button"
            className={`focus-ring inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium shadow-sm ${active === id ? tone : "border-line bg-white text-slate-700 hover:bg-slate-50"}`}
            onClick={() => {
              setActive(id);
              resetForm();
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <form
        className="rounded border border-line bg-white shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-3">
          <div className={`grid h-9 w-9 place-items-center rounded ring-1 ${activeTab?.[3] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
            <ActiveIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold">Create {activeTab?.[1]}</div>
            <div className="text-xs text-slate-500">Manage purchasing from requests to receiving and supplier invoices.</div>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-5">
          {active === "rfqs" || active === "orders" ? <PurchaseRequestSelect requests={requests.data ?? []} value={purchaseRequestId} onChange={setPurchaseRequestId} /> : null}
          {active === "quotes" || active === "orders" || active === "receipts" || active === "invoices" || active === "returns" ? <SupplierSelect suppliers={suppliers.data ?? []} value={supplierId} onChange={setSupplierId} required={active === "quotes" || (active === "orders" && !supplierQuotationId)} /> : null}
          {active === "quotes" ? <RfqSelect rfqs={rfqs.data ?? []} value={rfqId} onChange={setRfqId} /> : null}
          {active === "orders" ? <SupplierQuotationSelect quotes={quotes.data ?? []} value={supplierQuotationId} onChange={setSupplierQuotationId} /> : null}
          {active === "receipts" || active === "invoices" || active === "returns" ? <PurchaseOrderSelect orders={orders.data ?? []} value={purchaseOrderId} onChange={setPurchaseOrderId} /> : null}
          {active === "invoices" ? <GoodsReceiptSelect receipts={receipts.data ?? []} value={goodsReceiptId} onChange={setGoodsReceiptId} /> : null}
          {active === "receipts" || active === "returns" ? <PurchaseOrderLineSelect lines={selectedOrder?.lines ?? []} value={purchaseOrderLineId} onChange={setPurchaseOrderLineId} /> : null}

          {active === "requests" || active === "quotes" || (active === "orders" && !supplierQuotationId) ? (
            <>
              <ItemSelect items={items.data ?? []} value={itemId} onChange={setItemId} />
              <label className="text-sm">
                Quantity
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
              </label>
              <label className="text-sm">
                Unit price
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required />
              </label>
              <label className="text-sm">
                Tax %
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} />
              </label>
            </>
          ) : null}

          {active === "receipts" || active === "returns" ? (
            <label className="text-sm">
              Quantity
              <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </label>
          ) : null}

          {active === "invoices" ? (
            <>
              <label className="text-sm">
                Supplier invoice no.
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={reference} onChange={(event) => setReference(event.target.value)} required />
              </label>
              <label className="text-sm">
                Subtotal
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required />
              </label>
              <label className="text-sm">
                Tax total
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} />
              </label>
            </>
          ) : null}

          {active === "requests" || active === "rfqs" || active === "orders" ? (
            <label className="text-sm">
              {active === "requests" ? "Required date" : "Due / expected date"}
              <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={requiredDate} onChange={(event) => setRequiredDate(event.target.value)} />
            </label>
          ) : null}

          {active === "quotes" ? (
            <label className="text-sm">
              Lead time days
              <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={reference} onChange={(event) => setReference(event.target.value)} />
            </label>
          ) : null}

          <label className="text-sm md:col-span-4">
            Notes
            <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
        </div>

        {save.error ? <div className="mx-4 mb-3 text-sm text-red-700">{save.error.message}</div> : null}
        <div className="flex justify-end border-t border-line px-4 py-3">
          <button className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50" disabled={save.isPending}>
            <Save className="h-4 w-4" />
            {save.isPending ? "Saving..." : "Create"}
          </button>
        </div>
      </form>

      {active === "requests" ? <DataTable rows={requestRows} columns={["requestNo", "status", "lines"]} title="Purchase Requests" /> : null}
      {active === "rfqs" ? (
        <div className="space-y-4">
          <DataTable rows={rfqRows} columns={["rfqNo", "request", "status", "quotes", "bestTotal"]} title="RFQs" />
          {rfqId ? <DataTable rows={comparisonRows} columns={["quoteNo", "supplier", "total", "leadTimeDays"]} title={`Supplier Comparison ${comparison.data?.rfqNo ?? ""}`} /> : null}
        </div>
      ) : null}
      {active === "quotes" ? <DataTable rows={quoteRows} columns={["quoteNo", "supplier", "status", "total"]} title="Supplier Quotations" /> : null}
      {active === "orders" ? <DataTable rows={orderRows} columns={["poNo", "supplier", "status", "ordered", "received", "total"]} title="Purchase Orders" /> : null}
      {active === "receipts" ? <DataTable rows={receiptRows} columns={["receiptNo", "order", "status", "lines"]} title="Goods Receipts" /> : null}
      {active === "invoices" ? <DataTable rows={invoiceRows} columns={["invoiceNo", "supplierInvoiceNo", "order", "receipt", "matchingStatus", "status", "total"]} title="Supplier Invoices" /> : null}
      {active === "returns" ? <DataTable rows={returnRows} columns={["returnNo", "order", "supplier", "status", "lines"]} title="Purchase Returns" /> : null}
    </div>
  );
}

function bestQuoteTotal(rfq: PurchaseDocumentRow) {
  const totals = (rfq.supplierQuotations ?? []).map((quote) => Number(quote.total));
  if (!totals.length) return "-";
  return Math.min(...totals).toFixed(4);
}

function SupplierSelect({ suppliers, value, onChange, required }: { suppliers: SupplierRow[]; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="text-sm">
      Supplier
      <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        <option value="">Select supplier</option>
        {suppliers.filter((supplier) => supplier.status === "ACTIVE").map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.code} - {supplier.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PurchaseRequestSelect({ requests, value, onChange }: { requests: PurchaseDocumentRow[]; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      Purchase request
      <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No request</option>
        {requests.map((request) => (
          <option key={request.id} value={request.id}>
            {request.requestNo} - {request.status}
          </option>
        ))}
      </select>
    </label>
  );
}

function RfqSelect({ rfqs, value, onChange }: { rfqs: PurchaseDocumentRow[]; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      RFQ
      <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No RFQ</option>
        {rfqs.map((rfq) => (
          <option key={rfq.id} value={rfq.id}>
            {rfq.rfqNo} - {rfq.status}
          </option>
        ))}
      </select>
    </label>
  );
}

function SupplierQuotationSelect({ quotes, value, onChange }: { quotes: PurchaseDocumentRow[]; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      Supplier quote
      <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Manual lines</option>
        {quotes.map((quote) => (
          <option key={quote.id} value={quote.id}>
            {quote.quoteNo} - {quote.supplier?.code} - {quote.total}
          </option>
        ))}
      </select>
    </label>
  );
}

function PurchaseOrderSelect({ orders, value, onChange }: { orders: PurchaseDocumentRow[]; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm md:col-span-2">
      Purchase order
      <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select order</option>
        {orders.map((order) => (
          <option key={order.id} value={order.id}>
            {order.poNo} - {order.supplier?.code} - {order.status}
          </option>
        ))}
      </select>
    </label>
  );
}

function PurchaseOrderLineSelect({ lines, value, onChange }: { lines: NonNullable<PurchaseDocumentRow["lines"]>; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm md:col-span-2">
      Order line
      <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select line</option>
        {lines.map((line) => (
          <option key={line.id} value={line.id}>
            {line.description} - ordered {Number(line.quantity).toFixed(4)} / received {Number(line.receivedQuantity ?? "0").toFixed(4)}
          </option>
        ))}
      </select>
    </label>
  );
}

function GoodsReceiptSelect({ receipts, value, onChange }: { receipts: PurchaseDocumentRow[]; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      Goods receipt
      <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No receipt</option>
        {receipts.map((receipt) => (
          <option key={receipt.id} value={receipt.id}>
            {receipt.receiptNo} - {receipt.purchaseOrder?.poNo}
          </option>
        ))}
      </select>
    </label>
  );
}

function CustomerSelect({ customers, value, onChange, required }: { customers: CustomerRow[]; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="text-sm">
      Customer
      <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        <option value="">Select customer</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.code} - {customer.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ItemSelect({ items, value, onChange }: { items: ItemRow[]; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      Item
      <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select item</option>
        {items.filter((item) => item.isActive).map((item) => (
          <option key={item.id} value={item.id}>
            {item.code} - {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function HrView() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<"employees" | "leave" | "attendance" | "expenses" | "holidays" | "balances" | "checklists" | "certifications" | "approvals" | "notifications">("employees");
  const [employeeCode, setEmployeeCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [designation, setDesignation] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [employmentDate, setEmploymentDate] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [status, setStatus] = useState("PRESENT");
  const [category, setCategory] = useState("TRAVEL");
  const [amount, setAmount] = useState("1");
  const [notes, setNotes] = useState("");
  const [leaveCode, setLeaveCode] = useState("AL");
  const [leaveName, setLeaveName] = useState("Annual Leave");
  const [daysPerYear, setDaysPerYear] = useState("14");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayRegion, setHolidayRegion] = useState("");
  const [checklistType, setChecklistType] = useState("ONBOARDING");
  const [checklistTask, setChecklistTask] = useState("");
  const [checklistOwnerRole, setChecklistOwnerRole] = useState("");
  const [checklistDueDate, setChecklistDueDate] = useState("");
  const [delegateUserId, setDelegateUserId] = useState("");

  const employees = useQuery({ queryKey: ["hr", "employees"], queryFn: () => api<EmployeeRow[]>("/hr/employees") });
  const leaveTypes = useQuery({ queryKey: ["hr", "leave-types"], queryFn: () => api<LeaveTypeRow[]>("/hr/leave-types") });
  const leaveRequests = useQuery({ queryKey: ["hr", "leave-requests"], queryFn: () => api<LeaveRequestRow[]>("/hr/leave-requests") });
  const attendance = useQuery({ queryKey: ["hr", "attendance"], queryFn: () => api<AttendanceRow[]>("/hr/attendance") });
  const expenses = useQuery({ queryKey: ["hr", "expense-claims"], queryFn: () => api<ExpenseClaimRow[]>("/hr/expense-claims") });
  const holidays = useQuery({ queryKey: ["hr", "holidays"], queryFn: () => api<HolidayRow[]>("/hr/holidays") });
  const balances = useQuery({ queryKey: ["hr", "leave-balances"], queryFn: () => api<LeaveBalanceRow[]>("/hr/leave-balances") });
  const checklists = useQuery({ queryKey: ["hr", "checklists"], queryFn: () => api<ChecklistRow[]>("/hr/checklists") });
  const certificationAlerts = useQuery({ queryKey: ["hr", "certification-alerts"], queryFn: () => api<CertificationAlertRow[]>("/hr/certification-alerts") });
  const approvals = useQuery({ queryKey: ["hr", "approvals"], queryFn: () => api<ApprovalRow[]>("/hr/approvals") });
  const notifications = useQuery({ queryKey: ["hr", "notifications"], queryFn: () => api<NotificationRow[]>("/hr/notifications") });
  const branches = useQuery({ queryKey: ["branches"], queryFn: () => api<OrgUnit[]>("/branches") });
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => api<OrgUnit[]>("/departments") });
  const users = useQuery({ queryKey: ["users"], queryFn: () => api<UserRow[]>("/users") });

  const save = useMutation({
    mutationFn: async () => {
      if (active === "employees") {
        return api("/hr/employees", {
          method: "POST",
          body: JSON.stringify({
            employeeCode,
            firstName,
            lastName,
            designation: designation || undefined,
            departmentId: departmentId || undefined,
            branchId: branchId || undefined,
            employmentDate,
            employmentType: "FULL_TIME",
            emergencyContactName: notes || undefined
          })
        });
      }
      if (active === "leave") {
        if (!leaveTypes.data?.length) {
          await api("/hr/leave-types", { method: "POST", body: JSON.stringify({ code: leaveCode, name: leaveName, daysPerYear }) });
          await queryClient.invalidateQueries({ queryKey: ["hr", "leave-types"] });
          return null;
        }
        const request = await api<LeaveRequestRow>("/hr/leave-requests", {
          method: "POST",
          body: JSON.stringify({ employeeId, leaveTypeId, startDate, endDate, reason: notes || undefined })
        });
        return api(`/hr/leave-requests/${request.id}/submit`, { method: "POST" });
      }
      if (active === "attendance") {
        return api("/hr/attendance", {
          method: "POST",
          body: JSON.stringify({
            employeeId,
            attendanceDate,
            clockIn: clockIn || undefined,
            clockOut: clockOut || undefined,
            status,
            notes: notes || undefined
          })
        });
      }
      if (active === "expenses") {
        const claim = await api<ExpenseClaimRow>("/hr/expense-claims", {
          method: "POST",
          body: JSON.stringify({ employeeId, expenseDate: startDate, category, amount, description: notes || undefined })
        });
        return api(`/hr/expense-claims/${claim.id}/submit`, { method: "POST" });
      }
      if (active === "holidays") {
        return api("/hr/holidays", {
          method: "POST",
          body: JSON.stringify({ holidayDate, name: holidayName, region: holidayRegion || undefined })
        });
      }
      if (active === "checklists") {
        return api("/hr/checklists", {
          method: "POST",
          body: JSON.stringify({
            employeeId,
            type: checklistType,
            dueDate: checklistDueDate || undefined,
            notes: notes || undefined,
            lines: [{ task: checklistTask, ownerRole: checklistOwnerRole || undefined, dueDate: checklistDueDate || undefined }]
          })
        });
      }
      return null;
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["hr"] });
    }
  });

  const approvalDecision = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" | "return" }) =>
      api(`/hr/approvals/${id}/${action}`, { method: "POST", body: JSON.stringify({ comments: notes || undefined }) }),
    onSuccess: async () => {
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["hr"] });
    }
  });

  const delegateApproval = useMutation({
    mutationFn: (id: string) =>
      api(`/hr/approvals/${id}/delegate`, { method: "POST", body: JSON.stringify({ delegateToUserId: delegateUserId, comments: notes || undefined }) }),
    onSuccess: async () => {
      setDelegateUserId("");
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["hr"] });
    }
  });

  const escalateApprovals = useMutation({
    mutationFn: () => api<{ escalated: number }>("/hr/approvals/escalate-overdue", { method: "POST" }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["hr"] })
  });

  const completeChecklistLine = useMutation({
    mutationFn: (id: string) => api(`/hr/checklist-lines/${id}/complete`, { method: "POST", body: JSON.stringify({ notes: notes || undefined }) }),
    onSuccess: async () => {
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["hr", "checklists"] });
    }
  });

  const readNotification = useMutation({
    mutationFn: (id: string) => api(`/hr/notifications/${id}/read`, { method: "POST" }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["hr", "notifications"] })
  });

  const tabs: Array<[typeof active, string, LucideIcon, string]> = [
    ["employees", "Employees", Users, "border-cyan-200 bg-cyan-50 text-cyan-700"],
    ["leave", "Leave", FileClock, "border-emerald-200 bg-emerald-50 text-emerald-700"],
    ["attendance", "Attendance", CheckCircle2, "border-indigo-200 bg-indigo-50 text-indigo-700"],
    ["expenses", "Expenses", CircleDollarSign, "border-copper/30 bg-copper/10 text-copper"],
    ["holidays", "Holidays", CalendarDays, "border-sky/30 bg-sky/10 text-sky"],
    ["balances", "Balances", BarChart3, "border-emerald-200 bg-emerald-50 text-emerald-700"],
    ["checklists", "Checklists", ListChecks, "border-cyan-200 bg-cyan-50 text-cyan-700"],
    ["certifications", "Alerts", AlertTriangle, "border-red-200 bg-red-50 text-red-700"],
    ["approvals", "Approvals", ShieldCheck, "border-plum/30 bg-plum/10 text-plum"],
    ["notifications", "Notifications", Bell, "border-amber-200 bg-amber-50 text-amber-700"]
  ];
  const activeTab = tabs.find(([id]) => id === active);
  const ActiveIcon = activeTab?.[2] ?? UserRound;
  const employeeRows = (employees.data ?? []).map((employee) => ({
    id: employee.id,
    employeeCode: employee.employeeCode,
    name: employee.displayName,
    designation: employee.designation ?? "-",
    department: employee.department?.code ?? "-",
    branch: employee.branch?.code ?? "-",
    employmentType: employee.employmentType,
    status: employee.status
  }));
  const leaveRows = (leaveRequests.data ?? []).map((request) => ({
    id: request.id,
    employee: request.employee.employeeCode,
    leaveType: request.leaveType.code,
    start: new Date(request.startDate).toLocaleDateString(),
    end: new Date(request.endDate).toLocaleDateString(),
    days: request.days,
    status: request.status
  }));
  const attendanceRows = (attendance.data ?? []).map((entry) => ({
    id: entry.id,
    employee: entry.employee.employeeCode,
    date: new Date(entry.attendanceDate).toLocaleDateString(),
    shift: entry.shiftName ?? "-",
    clockIn: entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString() : "-",
    clockOut: entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : "-",
    status: entry.status
  }));
  const expenseRows = (expenses.data ?? []).map((claim) => ({
    id: claim.id,
    claimNo: claim.claimNo,
    employee: claim.employee.employeeCode,
    date: new Date(claim.expenseDate).toLocaleDateString(),
    category: claim.category,
    amount: claim.amount,
    status: claim.status
  }));
  const holidayRows = (holidays.data ?? []).map((holiday) => ({
    id: holiday.id,
    date: new Date(holiday.holidayDate).toLocaleDateString(),
    name: holiday.name,
    region: holiday.region ?? "All",
    paid: holiday.isPaid
  }));
  const balanceRows = (balances.data ?? []).map((balance) => ({
    id: balance.id,
    employee: `${balance.employeeCode} - ${balance.employeeName}`,
    leaveType: balance.leaveType,
    entitlement: balance.entitlement,
    used: balance.used,
    balance: balance.balance
  }));
  const checklistRows = (checklists.data ?? []).map((checklist) => ({
    id: checklist.id,
    checklistNo: checklist.checklistNo,
    employee: checklist.employee.employeeCode,
    type: checklist.type,
    dueDate: checklist.dueDate ? new Date(checklist.dueDate).toLocaleDateString() : "-",
    openTasks: checklist.lines.filter((line) => line.status !== "DONE").length,
    status: checklist.status
  }));
  const checklistLineRows = (checklists.data ?? []).flatMap((checklist) =>
    checklist.lines.map((line) => ({
      id: line.id,
      checklistNo: checklist.checklistNo,
      employee: checklist.employee.employeeCode,
      task: line.task,
      ownerRole: line.ownerRole ?? "-",
      dueDate: line.dueDate ? new Date(line.dueDate).toLocaleDateString() : "-",
      status: line.status
    }))
  );
  const certificationRows = (certificationAlerts.data ?? []).map((alert) => ({
    id: alert.id,
    employee: `${alert.employeeCode} - ${alert.employeeName}`,
    certification: alert.certification,
    expiryDate: new Date(alert.expiryDate).toLocaleDateString(),
    status: alert.status
  }));
  const notificationRows = (notifications.data ?? []).map((notification) => ({
    id: notification.id,
    title: notification.title,
    body: notification.body,
    created: new Date(notification.createdAt).toLocaleString(),
    status: notification.readAt ? "READ" : "UNREAD"
  }));

  function resetForm() {
    setEmployeeCode("");
    setFirstName("");
    setLastName("");
    setDesignation("");
    setDepartmentId("");
    setBranchId("");
    setEmploymentDate("");
    setEmployeeId("");
    setLeaveTypeId("");
    setStartDate("");
    setEndDate("");
    setAttendanceDate("");
    setClockIn("");
    setClockOut("");
    setStatus("PRESENT");
    setCategory("TRAVEL");
    setAmount("1");
    setNotes("");
    setHolidayDate("");
    setHolidayName("");
    setHolidayRegion("");
    setChecklistType("ONBOARDING");
    setChecklistTask("");
    setChecklistOwnerRole("");
    setChecklistDueDate("");
    setDelegateUserId("");
  }

  const hasCreateForm = ["employees", "leave", "attendance", "expenses", "holidays", "checklists"].includes(active);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tabs.map(([id, label, Icon, tone]) => (
          <button
            key={id}
            type="button"
            className={`focus-ring inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium shadow-sm ${active === id ? tone : "border-line bg-white text-slate-700 hover:bg-slate-50"}`}
            onClick={() => {
              setActive(id);
              resetForm();
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {hasCreateForm ? (
        <form
          className="rounded border border-line bg-white shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-3">
            <div className={`grid h-9 w-9 place-items-center rounded ring-1 ${activeTab?.[3] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
              <ActiveIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">{active === "leave" && !leaveTypes.data?.length ? "Create Leave Type" : `Create ${activeTab?.[1]}`}</div>
              <div className="text-xs text-slate-500">Manage HR administration, approvals, and notifications.</div>
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-6">
            {active === "employees" ? (
              <>
                <label className="text-sm">
                  Employee code
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} required />
                </label>
                <label className="text-sm">
                  First name
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Last name
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Designation
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={designation} onChange={(event) => setDesignation(event.target.value)} />
                </label>
                <label className="text-sm">
                  Employment date
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={employmentDate} onChange={(event) => setEmploymentDate(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Branch
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                    <option value="">No branch</option>
                    {(branches.data ?? []).map((branch) => <option key={branch.id} value={branch.id}>{branch.code} - {branch.name}</option>)}
                  </select>
                </label>
                <label className="text-sm md:col-span-2">
                  Department
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                    <option value="">No department</option>
                    {(departments.data ?? []).map((department) => <option key={department.id} value={department.id}>{department.code} - {department.name}</option>)}
                  </select>
                </label>
                <label className="text-sm md:col-span-4">
                  Emergency contact
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
                </label>
              </>
            ) : null}

            {active === "leave" && !leaveTypes.data?.length ? (
              <>
                <label className="text-sm">
                  Code
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={leaveCode} onChange={(event) => setLeaveCode(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-2">
                  Name
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={leaveName} onChange={(event) => setLeaveName(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Days per year
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={daysPerYear} onChange={(event) => setDaysPerYear(event.target.value)} required />
                </label>
              </>
            ) : null}

            {active === "leave" && (leaveTypes.data?.length ?? 0) > 0 ? (
              <>
                <EmployeeSelect employees={employees.data ?? []} value={employeeId} onChange={setEmployeeId} />
                <label className="text-sm md:col-span-2">
                  Leave type
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)} required>
                    <option value="">Select leave type</option>
                    {(leaveTypes.data ?? []).map((leaveType) => <option key={leaveType.id} value={leaveType.id}>{leaveType.code} - {leaveType.name}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  Start
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
                </label>
                <label className="text-sm">
                  End
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-6">
                  Reason
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
                </label>
              </>
            ) : null}

            {active === "attendance" ? (
              <>
                <EmployeeSelect employees={employees.data ?? []} value={employeeId} onChange={setEmployeeId} />
                <label className="text-sm">
                  Date
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Clock in
                  <input type="datetime-local" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={clockIn} onChange={(event) => setClockIn(event.target.value)} />
                </label>
                <label className="text-sm">
                  Clock out
                  <input type="datetime-local" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={clockOut} onChange={(event) => setClockOut(event.target.value)} />
                </label>
                <label className="text-sm">
                  Status
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={status} onChange={(event) => setStatus(event.target.value)}>
                    {["PRESENT", "ABSENT", "LATE", "HALF_DAY", "REMOTE"].map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                  </select>
                </label>
              </>
            ) : null}

            {active === "expenses" ? (
              <>
                <EmployeeSelect employees={employees.data ?? []} value={employeeId} onChange={setEmployeeId} />
                <label className="text-sm">
                  Expense date
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Category
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={category} onChange={(event) => setCategory(event.target.value)} required />
                </label>
                <label className="text-sm">
                  Amount
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={amount} onChange={(event) => setAmount(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-6">
                  Description
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
                </label>
              </>
            ) : null}

            {active === "holidays" ? (
              <>
                <label className="text-sm">
                  Date
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-3">
                  Holiday name
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={holidayName} onChange={(event) => setHolidayName(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-2">
                  Region
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={holidayRegion} onChange={(event) => setHolidayRegion(event.target.value)} placeholder="All" />
                </label>
              </>
            ) : null}

            {active === "checklists" ? (
              <>
                <EmployeeSelect employees={employees.data ?? []} value={employeeId} onChange={setEmployeeId} />
                <label className="text-sm">
                  Type
                  <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={checklistType} onChange={(event) => setChecklistType(event.target.value)}>
                    <option value="ONBOARDING">ONBOARDING</option>
                    <option value="OFFBOARDING">OFFBOARDING</option>
                  </select>
                </label>
                <label className="text-sm">
                  Due date
                  <input type="date" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={checklistDueDate} onChange={(event) => setChecklistDueDate(event.target.value)} />
                </label>
                <label className="text-sm md:col-span-2">
                  Owner role
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={checklistOwnerRole} onChange={(event) => setChecklistOwnerRole(event.target.value)} placeholder="HR Manager" />
                </label>
                <label className="text-sm md:col-span-6">
                  First task
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={checklistTask} onChange={(event) => setChecklistTask(event.target.value)} required />
                </label>
                <label className="text-sm md:col-span-6">
                  Notes
                  <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
                </label>
              </>
            ) : null}
          </div>

          {save.error ? <div className="mx-4 mb-3 text-sm text-red-700">{save.error.message}</div> : null}
          <div className="flex justify-end border-t border-line px-4 py-3">
            <button className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50" disabled={save.isPending}>
              <Save className="h-4 w-4" />
              {save.isPending ? "Saving..." : active === "leave" && leaveTypes.data?.length ? "Submit Leave" : active === "expenses" ? "Submit Claim" : active === "checklists" ? "Create Checklist" : "Save"}
            </button>
          </div>
        </form>
      ) : null}

      {active === "employees" ? <DataTable rows={employeeRows} columns={["employeeCode", "name", "designation", "department", "branch", "employmentType", "status"]} title="Employees" /> : null}
      {active === "leave" ? (
        <div className="space-y-4">
          <DataTable rows={(leaveTypes.data ?? []).map((row) => ({ id: row.id, code: row.code, name: row.name, daysPerYear: row.daysPerYear, active: row.isActive }))} columns={["code", "name", "daysPerYear", "active"]} title="Leave Types" />
          <DataTable rows={leaveRows} columns={["employee", "leaveType", "start", "end", "days", "status"]} title="Leave Requests" />
        </div>
      ) : null}
      {active === "attendance" ? <DataTable rows={attendanceRows} columns={["employee", "date", "shift", "clockIn", "clockOut", "status"]} title="Attendance" /> : null}
      {active === "expenses" ? <DataTable rows={expenseRows} columns={["claimNo", "employee", "date", "category", "amount", "status"]} title="Expense Claims" /> : null}
      {active === "holidays" ? <DataTable rows={holidayRows} columns={["date", "name", "region", "paid"]} title="Holiday Calendar" /> : null}
      {active === "balances" ? <DataTable rows={balanceRows} columns={["employee", "leaveType", "entitlement", "used", "balance"]} title="Leave Balances" /> : null}
      {active === "checklists" ? (
        <div className="space-y-4">
          <DataTable rows={checklistRows} columns={["checklistNo", "employee", "type", "dueDate", "openTasks", "status"]} title="Employee Checklists" />
          <DataTable rows={checklistLineRows} columns={["checklistNo", "employee", "task", "ownerRole", "dueDate", "status"]} title="Checklist Tasks" onComplete={(row) => completeChecklistLine.mutate(row.id)} canComplete={(row) => row.status !== "DONE"} />
          {completeChecklistLine.error ? <div className="text-sm text-red-700">{completeChecklistLine.error.message}</div> : null}
        </div>
      ) : null}
      {active === "certifications" ? <DataTable rows={certificationRows} columns={["employee", "certification", "expiryDate", "status"]} title="Certification Expiry Alerts" /> : null}
      {active === "approvals" ? (
        <section className="rounded border border-line bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
            <div>
              <div className="font-semibold">Approval Workbench</div>
              <div className="text-xs text-slate-500">{approvals.data?.length ?? 0} approval requests</div>
            </div>
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              disabled={escalateApprovals.isPending}
              onClick={() => escalateApprovals.mutate()}
            >
              <AlertTriangle className="h-4 w-4" />
              Escalate Overdue
            </button>
          </div>
          <div className="divide-y divide-line">
            {(approvals.data ?? []).map((approval) => {
              const current = approval.steps.find((step) => step.sequence === approval.currentStep);
              return (
                <div key={approval.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="font-medium">{approval.documentType} {approval.documentNo ?? approval.id}</div>
                    <div className="mt-1 text-sm text-slate-500">Status {approval.status} - step {approval.currentStep} {current ? `(${current.approverRole})` : ""}</div>
                    <div className="mt-1 text-xs text-slate-500">{approval.steps.map((step) => `${step.sequence}. ${step.approverRole}${step.approverUser ? ` -> ${step.approverUser.displayName}` : ""}: ${step.status}`).join(" | ")}</div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <input className="focus-ring w-56 rounded border border-line bg-white px-3 py-2 text-sm" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Comment" />
                    <select className="focus-ring w-52 rounded border border-line bg-white px-3 py-2 text-sm" value={delegateUserId} onChange={(event) => setDelegateUserId(event.target.value)}>
                      <option value="">Delegate to...</option>
                      {(users.data ?? []).filter((user) => user.status === "ACTIVE").map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}
                    </select>
                    <button
                      type="button"
                      className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm text-slate-700 hover:border-plum/40 hover:bg-plum/5 hover:text-plum disabled:opacity-50"
                      disabled={approval.status !== "PENDING" || !delegateUserId || delegateApproval.isPending}
                      onClick={() => delegateApproval.mutate(approval.id)}
                    >
                      Delegate
                    </button>
                    {(["approve", "return", "reject"] as const).map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm capitalize text-slate-700 hover:border-pine/40 hover:bg-pine/5 hover:text-pine disabled:opacity-50"
                        disabled={approval.status !== "PENDING" || approvalDecision.isPending}
                        onClick={() => approvalDecision.mutate({ id: approval.id, action })}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {approvalDecision.error ? <div className="border-t border-line px-4 py-3 text-sm text-red-700">{approvalDecision.error.message}</div> : null}
          {delegateApproval.error ? <div className="border-t border-line px-4 py-3 text-sm text-red-700">{delegateApproval.error.message}</div> : null}
          {escalateApprovals.error ? <div className="border-t border-line px-4 py-3 text-sm text-red-700">{escalateApprovals.error.message}</div> : null}
        </section>
      ) : null}
      {active === "notifications" ? (
        <DataTable rows={notificationRows} columns={["title", "body", "created", "status"]} title="Notifications" onComplete={(row) => readNotification.mutate(row.id)} canComplete={(row) => row.status === "UNREAD"} />
      ) : null}
    </div>
  );
}

function EmployeeSelect({ employees, value, onChange }: { employees: EmployeeRow[]; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm md:col-span-2">
      Employee
      <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select employee</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>{employee.employeeCode} - {employee.displayName}</option>
        ))}
      </select>
    </label>
  );
}

function ReportsView() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<"dashboard" | "operational" | "financial" | "integrations">("dashboard");
  const [exportError, setExportError] = useState("");
  const [emailRecipients, setEmailRecipients] = useState("admin@eversafe-demo.test");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailFormat, setEmailFormat] = useState<"csv" | "pdf">("csv");
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleKind, setScheduleKind] = useState<"dashboard" | "operational" | "financial">("dashboard");
  const [scheduleFrequency, setScheduleFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [scheduleNextRunAt, setScheduleNextRunAt] = useState("");
  const dashboard = useQuery({ queryKey: ["reports", "dashboard"], queryFn: () => api<ReportPayload>("/reports/dashboard") });
  const operational = useQuery({ queryKey: ["reports", "operational"], queryFn: () => api<ReportPayload>("/reports/operational") });
  const financial = useQuery({ queryKey: ["reports", "financial"], queryFn: () => api<ReportPayload>("/reports/financial") });
  const integrationStatus = useQuery({ queryKey: ["reports", "integrations", "status"], queryFn: () => api<IntegrationStatus>("/reports/integrations/status") });
  const tally = useQuery({ queryKey: ["reports", "integrations", "tally"], queryFn: () => api<TallyVoucherExport>("/reports/integrations/tally-vouchers") });
  const emailDeliveries = useQuery({ queryKey: ["reports", "email-deliveries"], queryFn: () => api<EmailDeliveryRow[]>("/reports/email-deliveries") });
  const schedules = useQuery({ queryKey: ["reports", "schedules"], queryFn: () => api<ReportScheduleRow[]>("/reports/schedules") });
  const report = active === "dashboard" ? dashboard.data : active === "operational" ? operational.data : active === "financial" ? financial.data : undefined;
  const emailReport = useMutation({
    mutationFn: (kind: "dashboard" | "operational" | "financial") =>
      api<EmailDeliveryRow>(`/reports/email/${kind}`, {
        method: "POST",
        body: JSON.stringify({
          recipients: emailRecipients.split(",").map((recipient) => recipient.trim()).filter(Boolean),
          subject: emailSubject || undefined,
          format: emailFormat
        })
      }),
    onSuccess: async () => {
      setEmailSubject("");
      await queryClient.invalidateQueries({ queryKey: ["reports", "email-deliveries"] });
    }
  });
  const createSchedule = useMutation({
    mutationFn: () =>
      api<ReportScheduleRow>("/reports/schedules", {
        method: "POST",
        body: JSON.stringify({
          name: scheduleName,
          kind: scheduleKind,
          format: emailFormat,
          recipients: emailRecipients.split(",").map((recipient) => recipient.trim()).filter(Boolean),
          subject: emailSubject || undefined,
          frequency: scheduleFrequency,
          nextRunAt: scheduleNextRunAt || undefined
        })
      }),
    onSuccess: async () => {
      setScheduleName("");
      setEmailSubject("");
      setScheduleNextRunAt("");
      await queryClient.invalidateQueries({ queryKey: ["reports", "schedules"] });
    }
  });
  const runSchedule = useMutation({
    mutationFn: (id: string) => api<ReportScheduleRow>(`/reports/schedules/${id}/run`, { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reports", "schedules"] });
      await queryClient.invalidateQueries({ queryKey: ["reports", "email-deliveries"] });
    }
  });
  const runDueSchedules = useMutation({
    mutationFn: () => api<{ processed: number }>("/reports/schedules/run-due", { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reports", "schedules"] });
      await queryClient.invalidateQueries({ queryKey: ["reports", "email-deliveries"] });
    }
  });
  const tabs: Array<[typeof active, string, LucideIcon, string]> = [
    ["dashboard", "Dashboard", LayoutDashboard, "border-sky/30 bg-sky/10 text-sky"],
    ["operational", "Operational", ClipboardList, "border-emerald-200 bg-emerald-50 text-emerald-700"],
    ["financial", "Financial", CircleDollarSign, "border-copper/30 bg-copper/10 text-copper"],
    ["integrations", "Integrations", ArrowRightLeft, "border-plum/30 bg-plum/10 text-plum"]
  ];

  async function downloadReport(kind: "dashboard" | "operational" | "financial", format: "csv" | "pdf") {
    setExportError("");
    const response = await fetch(`${apiUrl}/reports/export/${kind}?format=${format}`, { credentials: "include" });
    if (!response.ok) {
      setExportError(await response.text());
      return;
    }
    const content = await response.arrayBuffer();
    downloadBlob(`${kind}-report.${format}`, content, format === "pdf" ? "application/pdf" : "text/csv;charset=utf-8");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        {tabs.map(([id, label, Icon, tone]) => (
          <button
            key={id}
            type="button"
            className={`focus-ring inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium shadow-sm ${active === id ? tone : "border-line bg-white text-slate-700 hover:bg-slate-50"}`}
            onClick={() => {
              setActive(id);
              setExportError("");
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {active !== "integrations" ? (
        <>
          <section className="rounded border border-line bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
              <div>
                <div className="font-semibold">{tabs.find(([id]) => id === active)?.[1]} Reports</div>
                <div className="text-xs text-slate-500">Generated {report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : "on demand"}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-700 hover:border-pine/40 hover:bg-pine/5 hover:text-pine" onClick={() => downloadReport(active, "csv")}>
                  <Download className="h-4 w-4" />
                  CSV
                </button>
                <button type="button" className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-700 hover:border-plum/40 hover:bg-plum/5 hover:text-plum" onClick={() => downloadReport(active, "pdf")}>
                  <FileText className="h-4 w-4" />
                  PDF
                </button>
              </div>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
              {(report?.metrics ?? []).map((metric) => (
                <div key={String(metric.id ?? `${metric.section}-${metric.metric}`)} className="rounded border border-line bg-slate-50 p-3">
                  <div className="text-xs uppercase text-slate-500">{String(metric.section ?? "Report")}</div>
                  <div className="mt-1 text-sm text-slate-600">{String(metric.metric ?? "")}</div>
                  <div className="mt-2 text-xl font-semibold text-ink">{String(metric.value ?? "-")}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t border-line p-4 md:grid-cols-[1fr_1fr_140px_auto]">
              <label className="text-sm">
                Recipients
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={emailRecipients} onChange={(event) => setEmailRecipients(event.target.value)} />
              </label>
              <label className="text-sm">
                Subject
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} placeholder={`${tabs.find(([id]) => id === active)?.[1]} report`} />
              </label>
              <label className="text-sm">
                Format
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={emailFormat} onChange={(event) => setEmailFormat(event.target.value as "csv" | "pdf")}>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
              <div className="flex items-end">
                <button type="button" className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50" disabled={emailReport.isPending || !emailRecipients.trim()} onClick={() => emailReport.mutate(active)}>
                  <Bell className="h-4 w-4" />
                  {emailReport.isPending ? "Queueing..." : "Email"}
                </button>
              </div>
            </div>
            {exportError ? <div className="border-t border-line px-4 py-3 text-sm text-red-700">{exportError}</div> : null}
            {emailReport.error ? <div className="border-t border-line px-4 py-3 text-sm text-red-700">{emailReport.error.message}</div> : null}
          </section>

          <div className="space-y-4">
            {(report?.tables ?? []).map((table) => <ReportTable key={table.title} title={table.title} rows={table.rows} />)}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <section className="rounded border border-line bg-white shadow-sm">
            <div className="border-b border-line bg-slate-50 px-4 py-3">
              <div className="font-semibold">Integration Status</div>
              <div className="text-xs text-slate-500">Email, Tally export, and API documentation readiness.</div>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-3">
              {integrationStatus.data ? [
                { id: "email", label: "Email", value: integrationStatus.data.email.status, detail: integrationStatus.data.email.provider },
                { id: "tally", label: "Tally", value: integrationStatus.data.tally.status, detail: integrationStatus.data.tally.format },
                { id: "docs", label: "API Docs", value: integrationStatus.data.apiDocs.status, detail: integrationStatus.data.apiDocs.url }
              ].map((entry) => (
                <div key={entry.id} className="rounded border border-line bg-slate-50 p-3">
                  <div className="text-xs uppercase text-slate-500">{entry.label}</div>
                  <div className="mt-2 text-lg font-semibold text-ink">{entry.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{entry.detail}</div>
                </div>
              )) : <LoadingBand />}
            </div>
          </section>

          <section className="rounded border border-line bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
              <div>
                <div className="font-semibold">Scheduled Report Delivery</div>
                <div className="text-xs text-slate-500">Create recurring report emails and run due schedules on demand.</div>
              </div>
              <button type="button" className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-700 hover:border-pine/40 hover:bg-pine/5 hover:text-pine disabled:opacity-50" disabled={runDueSchedules.isPending} onClick={() => runDueSchedules.mutate()}>
                <FileClock className="h-4 w-4" />
                {runDueSchedules.isPending ? "Running..." : "Run Due"}
              </button>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-[1fr_160px_130px_130px_170px_auto]">
              <label className="text-sm">
                Schedule name
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={scheduleName} onChange={(event) => setScheduleName(event.target.value)} />
              </label>
              <label className="text-sm">
                Report
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={scheduleKind} onChange={(event) => setScheduleKind(event.target.value as "dashboard" | "operational" | "financial")}>
                  <option value="dashboard">Dashboard</option>
                  <option value="operational">Operational</option>
                  <option value="financial">Financial</option>
                </select>
              </label>
              <label className="text-sm">
                Frequency
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={scheduleFrequency} onChange={(event) => setScheduleFrequency(event.target.value as "DAILY" | "WEEKLY" | "MONTHLY")}>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </label>
              <label className="text-sm">
                Format
                <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={emailFormat} onChange={(event) => setEmailFormat(event.target.value as "csv" | "pdf")}>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
              <label className="text-sm">
                Next run
                <input type="datetime-local" className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={scheduleNextRunAt} onChange={(event) => setScheduleNextRunAt(event.target.value)} />
              </label>
              <div className="flex items-end">
                <button type="button" className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50" disabled={createSchedule.isPending || !scheduleName.trim() || !emailRecipients.trim()} onClick={() => createSchedule.mutate()}>
                  <Save className="h-4 w-4" />
                  {createSchedule.isPending ? "Saving..." : "Schedule"}
                </button>
              </div>
              <label className="text-sm md:col-span-3">
                Recipients
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={emailRecipients} onChange={(event) => setEmailRecipients(event.target.value)} />
              </label>
              <label className="text-sm md:col-span-3">
                Subject
                <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} placeholder="Optional email subject" />
              </label>
            </div>
            {createSchedule.error ? <div className="border-t border-line px-4 py-3 text-sm text-red-700">{createSchedule.error.message}</div> : null}
            {runSchedule.error ? <div className="border-t border-line px-4 py-3 text-sm text-red-700">{runSchedule.error.message}</div> : null}
            {runDueSchedules.error ? <div className="border-t border-line px-4 py-3 text-sm text-red-700">{runDueSchedules.error.message}</div> : null}
          </section>

          <ReportScheduleTable schedules={schedules.data ?? []} onRun={(id) => runSchedule.mutate(id)} running={runSchedule.isPending} />

          <ReportTable
            title="Tally Voucher Foundation"
            rows={(tally.data?.vouchers ?? []).map((voucher) => ({
              voucherNo: voucher.voucherNo,
              voucherDate: new Date(voucher.voucherDate).toLocaleDateString(),
              voucherType: voucher.voucherType,
              totalDebit: voucher.totalDebit,
              totalCredit: voucher.totalCredit,
              lines: voucher.lines.length
            }))}
          />
          <ReportTable
            title="Report Email Deliveries"
            rows={(emailDeliveries.data ?? []).map((delivery) => ({
              id: delivery.id,
              kind: delivery.kind,
              format: delivery.format,
              subject: delivery.subject,
              recipients: safeJsonArray(delivery.recipientsJson).join(", "),
              provider: delivery.provider ?? "-",
              attachment: delivery.attachmentName ?? "-",
              requestedBy: delivery.requestedBy?.displayName ?? "-",
              created: new Date(delivery.createdAt).toLocaleString(),
              sent: delivery.sentAt ? new Date(delivery.sentAt).toLocaleString() : "-",
              status: delivery.status,
              error: delivery.error ?? "-"
            }))}
          />
        </div>
      )}
    </div>
  );
}

function ReportTable({ title, rows }: { title: string; rows: ReportRow[] }) {
  const columns = Array.from(rows.reduce((keys, row) => {
    Object.keys(row).forEach((key) => keys.add(key));
    return keys;
  }, new Set<string>())).filter((key) => key !== "id");

  return (
    <section className="overflow-hidden rounded border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-slate-500">{rows.length} rows</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-white">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">{formatColumn(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length ? rows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="hover:bg-slate-50">
                {columns.map((column) => <td key={column} className="whitespace-nowrap px-4 py-2 text-slate-700">{String(row[column] ?? "-")}</td>)}
              </tr>
            )) : (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={Math.max(columns.length, 1)}>No report rows found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReportScheduleTable({ schedules, onRun, running }: { schedules: ReportScheduleRow[]; onRun: (id: string) => void; running: boolean }) {
  return (
    <section className="overflow-hidden rounded border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
        <div className="font-semibold">Report Schedules</div>
        <div className="text-xs text-slate-500">{schedules.length} schedules</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-white">
            <tr>
              {["name", "report", "frequency", "format", "recipients", "nextRun", "lastRun", "status", "action"].map((column) => (
                <th key={column} className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">{formatColumn(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {schedules.length ? schedules.map((schedule) => (
              <tr key={schedule.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-2 text-slate-700">{schedule.name}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-700">{schedule.kind}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-700">{schedule.frequency}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-700">{schedule.format}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-700">{safeJsonArray(schedule.recipientsJson).join(", ")}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-700">{new Date(schedule.nextRunAt).toLocaleString()}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-700">{schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : "-"}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-700">{schedule.status}</td>
                <td className="whitespace-nowrap px-4 py-2">
                  <button type="button" className="focus-ring rounded border border-line bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-pine/40 hover:bg-pine/5 hover:text-pine disabled:opacity-50" disabled={running || schedule.status !== "ACTIVE"} onClick={() => onRun(schedule.id)}>
                    Run
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={9}>No report schedules found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function safeJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function CompanyView() {
  const queryClient = useQueryClient();
  const company = useQuery({ queryKey: ["company"], queryFn: () => api<CompanySettings>("/company") });
  const [form, setForm] = useState<Partial<CompanySettings>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!company.data) return;
    setForm(company.data);
  }, [company.data]);

  const updateCompany = useMutation({
    mutationFn: () =>
      api<CompanySettings>("/company", {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          logoUrl: form.logoUrl || null,
          registrationNumber: form.registrationNumber || null,
          taxRegistrationNumber: form.taxRegistrationNumber || null,
          address: form.address || null,
          phone: form.phone || null,
          email: form.email || null,
          website: form.website || null,
          baseCurrency: form.baseCurrency,
          timezone: form.timezone,
          dateFormat: form.dateFormat,
          financialYearStartMonth: Number(form.financialYearStartMonth || 1),
          defaultTaxCode: form.defaultTaxCode || null,
          invoiceFooter: form.invoiceFooter || null,
          termsAndConditions: form.termsAndConditions || null
        })
      }),
    onSuccess: async () => {
      setMessage("Company settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["company"] });
    },
    onError: (error) => setMessage(error.message)
  });

  if (!company.data) return <LoadingBand />;
  return (
    <section className="space-y-4">
      <div className="rounded border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-semibold">Company Customization</div>
            <div className="text-sm text-slate-500">Edit legal identity, contact details, branding, currency, dates, invoice footer, and terms.</div>
          </div>
          <div className="flex items-center gap-3">
            {form.logoUrl ? (
              <img className="h-14 w-14 rounded border border-line bg-white object-contain p-2" src={form.logoUrl} alt="Company logo preview" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded border border-line bg-slate-50 text-lg font-semibold text-pine">E</div>
            )}
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50"
              disabled={updateCompany.isPending || !form.name || !form.baseCurrency || !form.timezone || !form.dateFormat}
              onClick={() => updateCompany.mutate()}
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>
        </div>
        {message ? <div className="mt-3 text-sm text-slate-600">{message}</div> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded border border-line bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminInput label="Company name" value={form.name ?? ""} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <AdminInput label="Email address" value={form.email ?? ""} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
            <AdminInput label="Phone" value={form.phone ?? ""} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
            <AdminInput label="Website" value={form.website ?? ""} onChange={(value) => setForm((current) => ({ ...current, website: value }))} />
            <AdminInput label="Registration number" value={form.registrationNumber ?? ""} onChange={(value) => setForm((current) => ({ ...current, registrationNumber: value }))} />
            <AdminInput label="Tax registration number" value={form.taxRegistrationNumber ?? ""} onChange={(value) => setForm((current) => ({ ...current, taxRegistrationNumber: value }))} />
            <AdminInput label="Base currency" value={form.baseCurrency ?? ""} onChange={(value) => setForm((current) => ({ ...current, baseCurrency: value.toUpperCase() }))} />
            <AdminInput label="Timezone" value={form.timezone ?? ""} onChange={(value) => setForm((current) => ({ ...current, timezone: value }))} />
            <AdminInput label="Date format" value={form.dateFormat ?? ""} onChange={(value) => setForm((current) => ({ ...current, dateFormat: value }))} />
            <AdminInput label="Financial year start month" type="number" value={String(form.financialYearStartMonth ?? 1)} onChange={(value) => setForm((current) => ({ ...current, financialYearStartMonth: Number(value) }))} />
            <label className="block text-sm font-medium md:col-span-2">
              Contact address
              <textarea className="focus-ring mt-1 min-h-24 w-full rounded border border-line bg-white px-3 py-2" value={form.address ?? ""} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-line bg-white p-5 shadow-sm">
            <div className="font-semibold">Logo and Icon</div>
            <div className="mt-1 text-sm text-slate-500">Use a secure image URL or upload a small PNG/JPG/SVG for the app icon.</div>
            <AdminInput label="Logo URL" value={form.logoUrl ?? ""} onChange={(value) => setForm((current) => ({ ...current, logoUrl: value }))} />
            <label className="focus-ring mt-3 inline-flex cursor-pointer items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-sky/40 hover:bg-sky/5 hover:text-sky">
              <Upload className="h-4 w-4" />
              Upload Logo
              <input
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const logoUrl = await fileToDataUrl(file);
                  setForm((current) => ({ ...current, logoUrl }));
                  event.target.value = "";
                }}
              />
            </label>
            {form.logoUrl ? (
              <button type="button" className="focus-ring ml-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}>
                Clear
              </button>
            ) : null}
          </div>

          <div className="rounded border border-line bg-white p-5 shadow-sm">
            <div className="font-semibold">Invoice Text</div>
            <label className="mt-3 block text-sm font-medium">
              Invoice footer
              <textarea className="focus-ring mt-1 min-h-20 w-full rounded border border-line bg-white px-3 py-2" value={form.invoiceFooter ?? ""} onChange={(event) => setForm((current) => ({ ...current, invoiceFooter: event.target.value }))} />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Terms and conditions
              <textarea className="focus-ring mt-1 min-h-24 w-full rounded border border-line bg-white px-3 py-2" value={form.termsAndConditions ?? ""} onChange={(event) => setForm((current) => ({ ...current, termsAndConditions: event.target.value }))} />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}

function OrganisationView() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<"branches" | "departments" | "warehouses" | "cost-centers">("branches");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [parentBranchId, setParentBranchId] = useState("");
  const branches = useQuery({ queryKey: ["branches"], queryFn: () => api<OrgUnit[]>("/branches") });
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => api<OrgUnit[]>("/departments") });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: () => api<OrgUnit[]>("/warehouses") });
  const costCenters = useQuery({ queryKey: ["cost-centers"], queryFn: () => api<OrgUnit[]>("/cost-centers") });
  const createUnit = useMutation({
    mutationFn: () =>
      api<OrgUnit>(`/${kind}`, {
        method: "POST",
        body: JSON.stringify({
          code,
          name,
          address: address || undefined,
          branchId: kind === "departments" || kind === "warehouses" ? parentBranchId || undefined : undefined
        })
      }),
    onSuccess: async () => {
      setCode("");
      setName("");
      setAddress("");
      setParentBranchId("");
      await queryClient.invalidateQueries({ queryKey: [kind] });
      await queryClient.invalidateQueries({ queryKey: ["topbar", "branches"] });
    }
  });
  return (
    <section className="space-y-4">
      <div className="rounded border border-line bg-white p-5 shadow-sm">
        <div className="font-semibold">Add Organisation Unit</div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <label className="block text-sm font-medium">
            Type
            <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={kind} onChange={(event) => setKind(event.target.value as "branches" | "departments" | "warehouses" | "cost-centers")}>
              <option value="branches">Branch</option>
              <option value="departments">Department</option>
              <option value="warehouses">Warehouse</option>
              <option value="cost-centers">Cost center</option>
            </select>
          </label>
          <AdminInput label="Code" value={code} onChange={setCode} />
          <AdminInput label="Name" value={name} onChange={setName} />
          <AdminInput label="Address" value={address} onChange={setAddress} />
          <label className="block text-sm font-medium">
            Parent branch
            <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={parentBranchId} onChange={(event) => setParentBranchId(event.target.value)} disabled={kind !== "departments" && kind !== "warehouses"}>
              <option value="">No branch</option>
              {(branches.data ?? []).map((branch) => <option key={branch.id} value={branch.id}>{branch.code} - {branch.name}</option>)}
            </select>
          </label>
        </div>
        {createUnit.error ? <div className="mt-3 text-sm text-red-700">{createUnit.error.message}</div> : null}
        <button type="button" className="focus-ring mt-4 inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50" disabled={createUnit.isPending || !code.trim() || !name.trim()} onClick={() => createUnit.mutate()}>
          <Plus className="h-4 w-4" />
          Add Unit
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <OrgTable title="Branches" rows={branches.data ?? []} />
        <OrgTable title="Departments" rows={departments.data ?? []} />
        <OrgTable title="Warehouses" rows={warehouses.data ?? []} />
        <OrgTable title="Cost Centers" rows={costCenters.data ?? []} />
      </div>
    </section>
  );
}

function OrgTable({ title, rows }: { title: string; rows: OrgUnit[] }) {
  return (
    <div className="rounded border border-line bg-white">
      <div className="border-b border-line px-4 py-3 font-semibold">{title}</div>
      <div className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{row.name}</div>
              <div className="text-slate-500">{row.code}</div>
            </div>
            <StatusPill value={row.isActive} />
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersView() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["users"], queryFn: () => api<UserRow[]>("/users") });
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => api<RoleRow[]>("/roles") });
  const [editingUserId, setEditingUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("Welcome123!");
  const [status, setStatus] = useState<"ACTIVE" | "INVITED" | "LOCKED" | "DISABLED">("INVITED");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const selectedUser = (users.data ?? []).find((user) => user.id === editingUserId);

  useEffect(() => {
    if (!selectedUser) return;
    setEmail(selectedUser.email);
    setUsername(selectedUser.username);
    setDisplayName(selectedUser.displayName);
    setStatus(selectedUser.status as "ACTIVE" | "INVITED" | "LOCKED" | "DISABLED");
    setRoleIds(selectedUser.roles.map((entry) => entry.role.id));
  }, [selectedUser]);

  const saveUser = useMutation({
    mutationFn: () =>
      api<UserRow>(editingUserId ? `/users/${editingUserId}` : "/users", {
        method: editingUserId ? "PATCH" : "POST",
        body: JSON.stringify({
          email,
          username,
          displayName,
          status,
          roleIds,
          temporaryPassword: editingUserId ? undefined : temporaryPassword
        })
      }),
    onSuccess: async () => {
      setEditingUserId("");
      setEmail("");
      setUsername("");
      setDisplayName("");
      setTemporaryPassword("Welcome123!");
      setStatus("INVITED");
      setRoleIds([]);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  const rows = (users.data ?? []).map((user) => ({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    username: user.username,
    status: user.status,
    roles: user.roles.map((entry) => entry.role.name).join(", ")
  }));

  return (
    <section className="space-y-4">
      <div className="rounded border border-line bg-white p-5 shadow-sm">
        <div className="font-semibold">{editingUserId ? "Edit User Access" : "Create User"}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <AdminInput label="Display name" value={displayName} onChange={setDisplayName} />
          <AdminInput label="Email" value={email} onChange={setEmail} />
          <AdminInput label="Username" value={username} onChange={setUsername} />
          <label className="block text-sm font-medium">
            Status
            <select className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" value={status} onChange={(event) => setStatus(event.target.value as "ACTIVE" | "INVITED" | "LOCKED" | "DISABLED")}>
              <option value="ACTIVE">Active</option>
              <option value="INVITED">Invited</option>
              <option value="LOCKED">Locked</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </label>
          {!editingUserId ? <AdminInput label="Temporary password" value={temporaryPassword} onChange={setTemporaryPassword} /> : null}
        </div>
        <PermissionCheckboxGrid
          title="Assign Roles"
          options={(roles.data ?? []).map((role) => ({ code: role.id, label: role.name, description: `${role.permissions.length} permissions${role.isSystem ? " - system role" : ""}` }))}
          selected={roleIds}
          onChange={setRoleIds}
        />
        {saveUser.error ? <div className="mt-3 text-sm text-red-700">{saveUser.error.message}</div> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50" disabled={saveUser.isPending || !email || !username || !displayName || roleIds.length === 0 || (!editingUserId && temporaryPassword.length < 8)} onClick={() => saveUser.mutate()}>
            <Save className="h-4 w-4" />
            {editingUserId ? "Update User" : "Create User"}
          </button>
          {editingUserId ? <button type="button" className="focus-ring rounded border border-line bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => setEditingUserId("")}>Cancel Edit</button> : null}
        </div>
      </div>
      <DataTable rows={rows} columns={["displayName", "email", "username", "status", "roles"]} title="Users" onEdit={(row) => setEditingUserId(row.id)} />
    </section>
  );
}

function RolesView() {
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => api<RoleRow[]>("/roles") });
  const permissions = useQuery({ queryKey: ["roles", "permissions"], queryFn: () => api<PermissionRow[]>("/roles/permissions") });
  const [editingRoleId, setEditingRoleId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const selectedRole = (roles.data ?? []).find((role) => role.id === editingRoleId);

  useEffect(() => {
    if (!selectedRole) return;
    setName(selectedRole.name);
    setDescription(selectedRole.description ?? "");
    setSelectedPermissions(selectedRole.permissions.map((entry) => entry.permission.code));
  }, [selectedRole]);

  const saveRole = useMutation({
    mutationFn: () =>
      api<RoleRow>(editingRoleId ? `/roles/${editingRoleId}` : "/roles", {
        method: editingRoleId ? "PATCH" : "POST",
        body: JSON.stringify({ name, description, permissions: selectedPermissions })
      }),
    onSuccess: async () => {
      setEditingRoleId("");
      setName("");
      setDescription("");
      setSelectedPermissions([]);
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
    }
  });

  const rows = useMemo(
    () =>
      (roles.data ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        type: role.isSystem ? "System" : "Custom",
        permissions: role.permissions.length,
        description: role.description ?? ""
      })),
    [roles.data]
  );
  const permissionOptions = (permissions.data ?? []).map((permission) => ({
    code: permission.code,
    label: permission.code,
    description: permission.description ?? `${permission.module} ${permission.action}`
  }));

  return (
    <section className="space-y-4">
      <div className="rounded border border-line bg-white p-5 shadow-sm">
        <div className="font-semibold">{editingRoleId ? "Edit Custom Role" : "Create Custom Role"}</div>
        {selectedRole?.isSystem ? <div className="mt-2 text-sm text-amber-700">System roles are protected. Create a custom role to change permissions.</div> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <AdminInput label="Role name" value={name} onChange={setName} />
          <AdminInput label="Description" value={description} onChange={setDescription} />
        </div>
        <PermissionCheckboxGrid title="Feature Permissions" options={permissionOptions} selected={selectedPermissions} onChange={setSelectedPermissions} />
        {saveRole.error ? <div className="mt-3 text-sm text-red-700">{saveRole.error.message}</div> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="focus-ring inline-flex items-center gap-2 rounded bg-pine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#145244] disabled:opacity-50" disabled={saveRole.isPending || !name.trim() || selectedPermissions.length === 0 || Boolean(selectedRole?.isSystem)} onClick={() => saveRole.mutate()}>
            <Save className="h-4 w-4" />
            {editingRoleId ? "Update Role" : "Create Role"}
          </button>
          <button type="button" className="focus-ring rounded border border-line bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => {
            setEditingRoleId("");
            setName("");
            setDescription("");
            setSelectedPermissions([]);
          }}>
            Clear
          </button>
        </div>
      </div>
      <DataTable rows={rows} columns={["name", "type", "permissions", "description"]} title="Roles" onEdit={(row) => {
        const role = (roles.data ?? []).find((entry) => entry.id === row.id);
        if (role?.isSystem) {
          setEditingRoleId("");
          setName(`${role.name} Custom`);
          setDescription(role.description ?? "");
          setSelectedPermissions(role.permissions.map((entry) => entry.permission.code));
        } else {
          setEditingRoleId(row.id);
        }
      }} />
    </section>
  );
}

function AdminInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function PermissionCheckboxGrid({
  title,
  options,
  selected,
  onChange
}: {
  title: string;
  options: Array<{ code: string; label: string; description?: string }>;
  selected: string[];
  onChange: (permissions: string[]) => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = options.filter((option) => `${option.label} ${option.description ?? ""}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const allFilteredSelected = filtered.length > 0 && filtered.every((option) => selected.includes(option.code));
  return (
    <div className="mt-4 rounded border border-line">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-slate-500">{selected.length} selected</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search permissions" />
          <button
            type="button"
            className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            onClick={() => {
              if (allFilteredSelected) {
                onChange(selected.filter((code) => !filtered.some((option) => option.code === code)));
              } else {
                onChange(Array.from(new Set([...selected, ...filtered.map((option) => option.code)])));
              }
            }}
          >
            {allFilteredSelected ? "Clear Filtered" : "Select Filtered"}
          </button>
        </div>
      </div>
      <div className="grid max-h-96 gap-2 overflow-auto p-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((option) => (
          <label key={option.code} className="flex cursor-pointer gap-3 rounded border border-line bg-white p-3 text-sm hover:border-sky/40 hover:bg-sky/5">
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.includes(option.code)}
              onChange={(event) => {
                onChange(event.target.checked ? [...selected, option.code] : selected.filter((code) => code !== option.code));
              }}
            />
            <span>
              <span className="block font-medium text-slate-800">{option.label}</span>
              {option.description ? <span className="block text-xs text-slate-500">{option.description}</span> : null}
            </span>
          </label>
        ))}
        {filtered.length === 0 ? <div className="text-sm text-slate-500">No permissions found.</div> : null}
      </div>
    </div>
  );
}

function AuditView() {
  const audit = useQuery({ queryKey: ["audit"], queryFn: () => api<AuditRow[]>("/audit-logs") });
  const rows = (audit.data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    module: row.module,
    user: row.user?.displayName ?? "System",
    createdAt: new Date(row.createdAt).toLocaleString()
  }));
  return <DataTable rows={rows} columns={["action", "module", "user", "createdAt"]} title="Audit events" />;
}

function AttachmentPanel({ target, onClose }: { target: AttachmentTarget; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [uploadError, setUploadError] = useState("");
  const attachments = useQuery({
    queryKey: ["attachments", target.recordType, target.recordId],
    queryFn: () => api<AttachmentRow[]>(`/attachments?recordType=${encodeURIComponent(target.recordType)}&recordId=${encodeURIComponent(target.recordId)}`)
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File exceeds the 5 MB limit");
      }

      return api<AttachmentRow>("/attachments", {
        method: "POST",
        body: JSON.stringify({
          recordType: target.recordType,
          recordId: target.recordId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64: await fileToDataUrl(file)
        })
      });
    },
    onSuccess: async () => {
      setUploadError("");
      await queryClient.invalidateQueries({ queryKey: ["attachments", target.recordType, target.recordId] });
    },
    onError: (error) => setUploadError(error.message)
  });

  return (
    <section className="rounded border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
            <Paperclip className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold">Attachments</div>
            <div className="text-xs text-slate-500">{target.label}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
            <Upload className="h-4 w-4" />
            Upload File
            <input
              className="sr-only"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.xls,.xlsx,.doc,.docx,application/pdf,image/png,image/jpeg,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = "";
              }}
            />
          </label>
          <button type="button" className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={onClose}>
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="text-sm text-slate-600">Allowed: PDF, images, CSV, Excel, Word, and text files up to 5 MB.</div>
        {uploadError ? <div className="text-sm text-red-700">{uploadError}</div> : null}
        {attachments.isLoading ? <div className="text-sm text-slate-500">Loading attachments...</div> : null}
        <div className="divide-y divide-line rounded border border-line">
          {(attachments.data ?? []).map((attachment) => (
            <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <div className="font-medium text-ink">{attachment.originalName}</div>
                <div className="text-xs text-slate-500">
                  {formatBytes(attachment.sizeBytes)} - {attachment.mimeType} - {new Date(attachment.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-1.5 text-sm text-slate-600 hover:border-sky/40 hover:bg-sky/5 hover:text-sky"
                onClick={() => void downloadAttachment(attachment)}
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          ))}
          {!attachments.isLoading && (attachments.data ?? []).length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">No attachments yet</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function importFieldsFor(target: "customers" | "suppliers" | "items" | "masters", masterKind: string) {
  if (target === "customers" || target === "suppliers") {
    return ["code", "name", "contactPerson", "email", "phone", "status"];
  }

  if (target === "items") {
    return ["code", "name", "itemType", "sellingPrice", "purchasePrice", "reorderLevel"];
  }

  if (masterKind === "tax-codes") return ["code", "name", "ratePercent"];
  if (masterKind === "currencies") return ["code", "name", "symbol"];
  if (masterKind === "payment-terms") return ["code", "name", "days"];
  return ["code", "name"];
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);

  const headers = rows[0] ?? [];
  return {
    headers,
    rows: rows.slice(1).map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
    )
  };
}

function defaultImportMapping(fields: string[], headers: string[]) {
  const normalizedHeaders = new Map(headers.map((header) => [normalizeFieldName(header), header]));
  return Object.fromEntries(fields.map((field) => [field, normalizedHeaders.get(normalizeFieldName(field)) ?? ""]));
}

function downloadImportTemplate(target: "customers" | "suppliers" | "items" | "masters", masterKind: string) {
  const fields = importFieldsFor(target, masterKind);
  const sample = fields.map((field) => {
    if (field === "code") return target === "customers" ? "CUST-NEW" : target === "suppliers" ? "SUP-NEW" : target === "items" ? "ITEM-NEW" : "NEW";
    if (field === "name") return "New Record";
    if (field === "email") return "accounts@example.test";
    if (field === "status") return "ACTIVE";
    if (field === "itemType") return "Stock";
    if (field === "sellingPrice" || field === "purchasePrice" || field === "reorderLevel" || field === "ratePercent") return "0";
    if (field === "days") return "30";
    if (field === "symbol") return "$";
    return "";
  });
  downloadTextFile(`${target === "masters" ? masterKind : target}-template.csv`, [fields, sample].map(csvLine).join("\n"));
}

function downloadImportErrorReport(rows: ImportPreviewRow[]) {
  const lines = [["rowNumber", "code", "name", "errors"], ...rows.map((row) => [String(row.rowNumber), String(row.normalized.code ?? ""), String(row.normalized.name ?? ""), row.errors.join("; ")])];
  downloadTextFile("import-errors.csv", lines.map(csvLine).join("\n"));
}

function inventoryImportFields(target: InventoryImportTarget) {
  if (target === "transfers") return ["itemCode", "fromWarehouseCode", "toWarehouseCode", "quantity", "remarks"];
  if (target === "counts") return ["itemCode", "warehouseCode", "countedQuantity", "remarks"];
  return ["itemCode", "warehouseCode", "movementType", "quantity", "unitCost", "reason", "remarks"];
}

async function parseSpreadsheetFile(file: File) {
  if (file.name.toLowerCase().endsWith(".csv")) return parseCsv(await file.text());

  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("Workbook does not contain any sheets");

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
    header: 1,
    raw: false,
    defval: ""
  }) as unknown[][];
  const [headerRow, ...bodyRows] = matrix.filter((row) => row.some((cell) => String(cell ?? "").trim().length > 0));
  const headers = (headerRow ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean);
  if (!headers.length) throw new Error("The first row must contain column headers");

  return {
    headers,
    rows: bodyRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, String(values[index] ?? "").trim()])))
  };
}

async function downloadInventoryExcelTemplate(target: InventoryImportTarget) {
  const XLSX = await import("xlsx");
  const fields = inventoryImportFields(target);
  const sample = fields.map((field) => {
    if (field === "itemCode") return "ITEM-001";
    if (field === "fromWarehouseCode" || field === "warehouseCode") return "MAIN";
    if (field === "toWarehouseCode") return "WEST-ST";
    if (field === "movementType") return "IN";
    if (field === "quantity" || field === "countedQuantity") return "1";
    if (field === "unitCost") return "0";
    if (field === "reason") return "Bulk import";
    if (field === "remarks") return "Imported from Excel";
    return "";
  });
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([fields, sample]);
  XLSX.utils.book_append_sheet(workbook, worksheet, formatColumn(target).slice(0, 31));
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  downloadBlob(`${target}-inventory-template.xlsx`, data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

function inventoryImportPreviewColumns(target: InventoryImportTarget): (keyof InventoryImportPreviewTableRow)[] {
  if (target === "transfers") return ["rowNumber", "itemCode", "fromWarehouseCode", "toWarehouseCode", "quantity", "status"];
  if (target === "counts") return ["rowNumber", "itemCode", "warehouseCode", "countedQuantity", "status"];
  return ["rowNumber", "itemCode", "warehouseCode", "movementType", "quantity", "unitCost", "reason", "status"];
}

function inventoryImportPreviewRows(preview: InventoryImportPreview): InventoryImportPreviewTableRow[] {
  return preview.rows.map((row) => ({
    id: String(row.rowNumber),
    rowNumber: row.rowNumber,
    itemCode: row.normalized.itemCode ?? "",
    fromWarehouseCode: row.normalized.fromWarehouseCode ?? "",
    toWarehouseCode: row.normalized.toWarehouseCode ?? "",
    warehouseCode: row.normalized.warehouseCode ?? "",
    movementType: row.normalized.movementType ?? "",
    quantity: row.normalized.quantity ?? "",
    countedQuantity: row.normalized.countedQuantity ?? "",
    unitCost: row.normalized.unitCost ?? "",
    reason: row.normalized.reason ?? "",
    status: row.errors.length ? row.errors.join("; ") : "Ready"
  }));
}

function downloadInventoryImportErrors(preview: InventoryImportPreview) {
  const lines = [
    ["rowNumber", "itemCode", "warehouse", "quantity", "errors"],
    ...preview.rows
      .filter((row) => row.errors.length > 0)
      .map((row) => [
        String(row.rowNumber),
        row.normalized.itemCode ?? "",
        row.normalized.warehouseCode ?? row.normalized.fromWarehouseCode ?? "",
        row.normalized.quantity ?? row.normalized.countedQuantity ?? "",
        row.errors.join("; ")
      ])
  ];
  downloadTextFile(`${preview.target}-inventory-import-errors.csv`, lines.map(csvLine).join("\n"));
}

function downloadTextFile(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvLine(values: string[]) {
  return values.map((value) => `"${value.replace(/"/g, '""')}"`).join(",");
}

function normalizeFieldName(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function loadSavedTableViews(storageKey: string): SavedTableView[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(storageKey);
    if (!value) return [];
    const parsed = JSON.parse(value) as SavedTableView[];
    return Array.isArray(parsed) ? parsed.filter((view) => view.name && Array.isArray(view.columns)) : [];
  } catch {
    return [];
  }
}

function saveSavedTableViews(storageKey: string, views: SavedTableView[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(views));
}

function exportTableCsv<T>(title: string, rows: T[], columns: string[]) {
  const header = columns.map(formatColumn);
  const body = rows.map((row) =>
    columns.map((column) => sanitizeCsvValue((row as Record<string, unknown>)[column]))
  );
  const csv = [header, ...body].map(csvLine).join("\n");
  downloadTextFile(`${normalizeFieldName(title) || "export"}.csv`, csv);
}

function sanitizeCsvValue(value: unknown) {
  const text = typeof value === "boolean" ? (value ? "Active" : "Inactive") : String(value ?? "");
  const trimmedStart = text.trimStart();
  return /^[=+\-@\t\r]/.test(trimmedStart) ? `'${text}` : text;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

async function downloadAttachment(attachment: AttachmentRow) {
  const response = await fetch(`${apiUrl}/attachments/${attachment.id}/download`, { credentials: "include" });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.originalName;
  link.click();
  URL.revokeObjectURL(url);
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DataTable<T extends { id: string }>({
  rows,
  columns,
  title,
  onEdit,
  onToggle,
  onAttachments,
  onConvert,
  canConvert,
  onRevise,
  canRevise,
  onComplete,
  canComplete
}: {
  rows: T[];
  columns: (keyof T)[];
  title: string;
  onEdit?: (row: T) => void;
  onToggle?: (row: T) => void;
  onAttachments?: (row: T) => void;
  onConvert?: (row: T) => void;
  canConvert?: (row: T) => boolean;
  onRevise?: (row: T) => void;
  canRevise?: (row: T) => boolean;
  onComplete?: (row: T) => void;
  canComplete?: (row: T) => boolean;
}) {
  const hasActions = Boolean(onEdit || onToggle || onAttachments || onConvert || onRevise || onComplete);
  const columnKeySignature = columns.map((column) => String(column)).join("|");
  const columnKeys = useMemo(() => columnKeySignature.split("|").filter(Boolean), [columnKeySignature]);
  const storageKey = useMemo(() => `erp-table-view:${title}`, [title]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columnKeys);
  const [savedViews, setSavedViews] = useState<SavedTableView[]>([]);
  const [selectedViewName, setSelectedViewName] = useState("");
  const [viewName, setViewName] = useState("");

  useEffect(() => {
    const storedViews = loadSavedTableViews(storageKey);
    const firstView = storedViews[0];
    setSavedViews(storedViews);
    setVisibleColumns(firstView ? firstView.columns.filter((column) => columnKeys.includes(column)) : columnKeys);
    setSearchTerm(firstView?.searchTerm ?? "");
    setSelectedViewName(firstView?.name ?? "");
    setViewName("");
  }, [columnKeySignature, storageKey]);

  const selectedColumns = columnKeys.filter((column) => visibleColumns.includes(column));
  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return rows;

    return rows.filter((row) =>
      columnKeys.some((column) => String((row as Record<string, unknown>)[column] ?? "").toLowerCase().includes(normalizedSearch))
    );
  }, [columnKeys, rows, searchTerm]);

  function toggleColumn(column: string) {
    setVisibleColumns((current) => {
      if (current.includes(column)) {
        return current.length === 1 ? current : current.filter((entry) => entry !== column);
      }

      return columnKeys.filter((entry) => entry === column || current.includes(entry));
    });
  }

  function saveView() {
    const name = viewName.trim() || `${title} View`;
    const nextViews = [
      { name, columns: selectedColumns, searchTerm },
      ...savedViews.filter((view) => view.name !== name)
    ].slice(0, 6);
    setSavedViews(nextViews);
    setSelectedViewName(name);
    setViewName("");
    saveSavedTableViews(storageKey, nextViews);
  }

  function applyView(name: string) {
    setSelectedViewName(name);
    const view = savedViews.find((entry) => entry.name === name);
    if (!view) return;
    setVisibleColumns(view.columns.filter((column) => columnKeys.includes(column)));
    setSearchTerm(view.searchTerm);
  }

  function deleteView(name: string) {
    const nextViews = savedViews.filter((view) => view.name !== name);
    setSavedViews(nextViews);
    setSelectedViewName("");
    saveSavedTableViews(storageKey, nextViews);
  }

  return (
    <div className="overflow-hidden rounded border border-line bg-white shadow-sm">
      <div className="space-y-3 border-b border-line bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-slate-500">{filteredRows.length} of {rows.length} rows</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-56 items-center gap-2 rounded border border-line bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-sky" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={`Search ${title.toLowerCase()}`}
              />
            </div>
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-sky/40 hover:bg-sky/5 hover:text-sky"
              onClick={() => exportTableCsv(title, filteredRows, selectedColumns)}
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm text-slate-600"
            value={selectedViewName}
            onChange={(event) => applyView(event.target.value)}
            aria-label={`${title} saved views`}
          >
            <option value="">Saved views</option>
            {savedViews.map((view) => (
              <option key={view.name} value={view.name}>
                {view.name}
              </option>
            ))}
          </select>
          <input
            className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm"
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
            placeholder="View name"
          />
          <button
            type="button"
            className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-pine/40 hover:bg-pine/5 hover:text-pine"
            onClick={saveView}
          >
            <Save className="h-4 w-4" />
            Save View
          </button>
          {savedViews.length > 0 ? (
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
              disabled={!selectedViewName}
              onClick={() => deleteView(selectedViewName)}
            >
              <Trash2 className="h-4 w-4" />
              Remove View
            </button>
          ) : null}
          <details className="relative">
            <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
              <Columns3 className="h-4 w-4" />
              Columns
            </summary>
            <div className="absolute z-20 mt-2 w-64 rounded border border-line bg-white p-2 shadow-lg">
              {columnKeys.map((column) => (
                <label key={column} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={visibleColumns.includes(column)} onChange={() => toggleColumn(column)} />
                  {formatColumn(column)}
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead className="bg-[#eef4f1] text-left text-xs uppercase text-slate-600">
            <tr>
              {selectedColumns.map((column) => (
                <th key={column} className="border-b border-line px-4 py-3">
                  {formatColumn(column)}
                </th>
              ))}
              {hasActions ? <th className="border-b border-line px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0 hover:bg-slate-50/80">
                {selectedColumns.map((column) => (
                  <td key={column} className="px-4 py-3 align-middle">
                    <CellValue column={column} value={(row as Record<string, unknown>)[column]} />
                  </td>
                ))}
                {hasActions ? (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {onEdit ? (
                        <button
                          type="button"
                          className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-1.5 text-sm text-slate-600 hover:border-pine/40 hover:bg-pine/5 hover:text-pine"
                          onClick={() => onEdit(row)}
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                      ) : null}
                      {onToggle ? (
                        <button
                          type="button"
                          className={`focus-ring inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm ${
                            isRecordActive(row)
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          onClick={() => onToggle(row)}
                        >
                          {isRecordActive(row) ? <X className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          {isRecordActive(row) ? "Deactivate" : "Activate"}
                        </button>
                      ) : null}
                      {onAttachments ? (
                        <button
                          type="button"
                          className="focus-ring inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-1.5 text-sm text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                          onClick={() => onAttachments(row)}
                        >
                          <Paperclip className="h-4 w-4" />
                          Files
                        </button>
                      ) : null}
                      {onConvert ? (
                        <button
                          type="button"
                          className="focus-ring inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-line disabled:bg-slate-100 disabled:text-slate-400"
                          disabled={canConvert ? !canConvert(row) : false}
                          onClick={() => onConvert(row)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Convert
                        </button>
                      ) : null}
                      {onRevise ? (
                        <button
                          type="button"
                          className="focus-ring inline-flex items-center gap-2 rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-line disabled:bg-slate-100 disabled:text-slate-400"
                          disabled={canRevise ? !canRevise(row) : false}
                          onClick={() => onRevise(row)}
                        >
                          <FileText className="h-4 w-4" />
                          Revise
                        </button>
                      ) : null}
                      {onComplete ? (
                        <button
                          type="button"
                          className="focus-ring inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-line disabled:bg-slate-100 disabled:text-slate-400"
                          disabled={canComplete ? !canComplete(row) : false}
                          onClick={() => onComplete(row)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Complete
                        </button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={selectedColumns.length + (hasActions ? 1 : 0)}>
                  No records found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CellValue({ column, value }: { column: string; value: unknown }) {
  if (column === "status" || column === "isActive") {
    return <StatusPill value={value} />;
  }

  if (column === "code" || column === "action" || column === "module" || column === "itemType") {
    return <span className="inline-flex rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 ring-1 ring-slate-200">{String(value ?? "-")}</span>;
  }

  return <span className="text-slate-700">{String(value ?? "-") || "-"}</span>;
}

function ImportJobStatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    QUEUED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    PROCESSING: "bg-cyan-50 text-cyan-700 ring-cyan-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    COMPLETED_WITH_ERRORS: "bg-amber-50 text-amber-700 ring-amber-200",
    FAILED: "bg-red-50 text-red-700 ring-red-200"
  };
  const tone = tones[status] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{formatColumn(status.toLowerCase())}</span>;
}

function StatusPill({ value }: { value: unknown }) {
  const text = typeof value === "boolean" ? (value ? "Active" : "Inactive") : String(value ?? "-");
  const active = text.toLowerCase() === "active" || text.toLowerCase() === "true";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
      {text}
    </span>
  );
}

function isRecordActive(row: unknown) {
  if (row && typeof row === "object" && "isActive" in row) {
    return Boolean((row as { isActive?: boolean }).isActive);
  }

  if (row && typeof row === "object" && "status" in row) {
    return String((row as { status?: string }).status ?? "").toLowerCase() === "active";
  }

  return true;
}

function formatColumn(column: string) {
  return column.replace(/[-_]/g, " ").replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}

function LogoutButton() {
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => queryClient.setQueryData(["me"], null)
  });
  return (
    <button
      className="focus-ring rounded border border-line p-2 text-slate-600 hover:bg-slate-50"
      title="Logout"
      onClick={() => logout.mutate()}
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}

function LoadingBand() {
  return <div className="rounded border border-line bg-white p-6 text-sm text-slate-500">Loading...</div>;
}

function viewTitle(view: string) {
  return (
    {
      dashboard: "Management Dashboard",
      "master-data": "Master Data",
      "sales-crm": "Sales & CRM",
      purchase: "Purchasing",
      inventory: "Inventory",
      accounting: "Accounting",
      hr: "HR & Approvals",
      reports: "Reports",
      company: "Company Settings",
      organisation: "Company Structure",
      users: "Users",
      roles: "Roles and Permissions",
      audit: "Audit Logs"
    }[view] ?? "ERP"
  );
}

export default AppShell;
