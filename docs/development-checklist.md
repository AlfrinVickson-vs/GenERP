# Development Checklist

## Phase 1

- [x] Product requirements document
- [x] System architecture
- [x] Database ERD
- [x] Module dependency map
- [x] Role and permission matrix
- [x] Security threat model
- [x] Repository folder structure
- [x] Environment-variable template
- [x] Database schema plan
- [x] Development checklist
- [x] Monorepo scaffold
- [x] API foundation
- [x] Web foundation
- [x] Worker foundation
- [x] Docker deployment files
- [x] Seed demo company
- [x] Auth and permission tests
- [ ] Production backup restore test

## Phase 2

- [x] Customer, supplier, and item database schema
- [x] Supporting masters for categories, units, tax codes, currencies, payment terms, and warehouse bins
- [x] Backend master-data endpoints with permission guards
- [x] Seeded demo customers, suppliers, items, and supporting masters
- [x] Frontend Master Data screen with create forms and tables
- [x] Edit workflow for customer, supplier, and item records
- [x] Edit workflow for supporting master records
- [x] Non-destructive deactivate/reactivate workflow for master records
- [x] Professional Tailwind visual pass for dashboard and master-data screens
- [x] Mobile navigation access to Phase 2 screens
- [x] CSV import workflow with upload, mapping, validation, preview, import, and error report
- [x] Attachments and file validation for master records
- [x] Saved views, configurable columns, and hardened CSV exports
- [x] Master-data validation for duplicate codes, numeric bounds, statuses, tax rates, and payment terms
- [x] Background processing for large import jobs
- [x] Opening-stock workflows and unit-specific constraints

## Phase 3

- [x] CRM and sales database schema for leads, opportunities, quotations, sales orders, and deliveries
- [x] Sales and CRM API endpoints with permission guards
- [x] Sales & CRM frontend workspace with simple creation forms and tables
- [x] Demo lead, opportunity, quotation, and sales order seed data
- [x] Sales order stock reservation check for stock-managed items
- [x] Posted delivery stock issue through immutable stock ledger
- [x] Quotation-to-order conversion action
- [x] Delivery partial-fulfilment dashboard and backorder reporting
- [x] Follow-up activities and overdue activity report
- [x] Customer enquiry and quotation revision workflow
- [x] Sales invoice, receipt, credit note, and return workflows

## Phase 4

- [x] Purchase and inventory database schema for requests, RFQs, supplier quotations, purchase orders, goods receipts, supplier invoices, and purchase returns
- [x] Purchase API endpoints with permission guards
- [x] Purchase workspace with creation forms, comparison views, and document tables
- [x] Goods receipt stock-in posting through immutable stock ledger
- [x] Purchase return stock-out posting through immutable stock ledger
- [x] Supplier invoice three-way matching with quantity, price, tax, and duplicate-invoice flags
- [x] Stock transfers, stock counts, stock adjustments, and inventory valuation reporting
- [x] Bulk Excel import for inventory transfers, counts, and adjustments with preview, validation, and commit

## Phase 5

- [x] Accounting schema for chart of accounts, financial periods, journal entries, journal lines, and supplier payments
- [x] Accounting API endpoints with permission guards
- [x] Accounting workspace for chart setup, periods, journals, posting, payments, trial balance, and ageing
- [x] Double-entry journal validation with debit and credit balance enforcement
- [x] Open financial-period validation before posting
- [x] Automatic GL posting for sales invoices, customer receipts, supplier invoices, and supplier payments
- [x] Supplier payment workflow with AP balance update
- [x] Trial balance, receivables ageing, and payables ageing reports
- [x] Bank reconciliation
- [x] Tax summary reporting
- [x] Balance sheet, profit and loss, and cash-flow statements
- [x] Recurring journals, budgets, opening balances, and year-end close

## Phase 6

- [x] HR and approval database schema for employees, leave, attendance, expense claims, approval requests, approval steps, and approval history
- [x] HR permissions and seeded demo role access
- [x] Employee records with encrypted emergency-contact fields
- [x] Leave types and leave requests with approval submission
- [x] Attendance recording
- [x] Expense claims with approval submission
- [x] Reusable approval workflow with approve, reject, return-for-correction actions and segregation-of-duties check
- [x] In-app notifications for approval requests and completion updates
- [x] HR & Approvals frontend workspace
- [x] Approval delegation and overdue escalation
- [x] Employee onboarding/offboarding checklists, holiday calendar, leave balance reporting, and certification-expiry alerts

## Phase 7

- [x] Cross-module dashboards and management report endpoints
- [x] Operational reports for sales, purchasing, inventory alerts, overdue activities, and overdue approvals
- [x] Financial report endpoint with trial balance, receivables, payables, and summary metrics
- [x] CSV and PDF export endpoints for dashboard, operational, and financial reports
- [x] Email notification configuration status endpoint
- [x] Queued report-email delivery workflow with persisted delivery log and SMTP-ready worker
- [x] Scheduled recurring report delivery with due-run processing and schedule status tracking
- [x] Tally integration foundation using posted journal voucher export
- [x] API documentation refreshed through Swagger `/docs`
- [x] Reports frontend workspace with export actions and integration status

## Commands

- Install dependencies: `npm install`
- Generate Prisma client: `npm run prisma:generate -w @erp/api`
- Start dependencies: `docker compose up postgres redis -d`
- Run migrations: `npm run prisma:migrate -w @erp/api`
- Seed demo data: `npm run prisma:seed -w @erp/api`
- Start API: `npm run dev -w @erp/api`
- Start web: `npm run dev -w @erp/web`
- Start worker: `npm run dev -w @erp/worker`
- Run tests: `npm test`
