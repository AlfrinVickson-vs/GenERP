# Single-Company ERP System — Complete AI Vibe-Coding Prompt

## Project Objective

Build a secure, fully functional ERP system for **one company only**.

This is **not a multi-tenant SaaS application**. The ERP will be installed and used by a single organisation with multiple branches, departments, warehouses, users, and roles.

The system must be practical, easy to use, secure, and focused on the essential daily operations of a company.

Do not add unnecessary enterprise features, complex subscription systems, tenant management, SaaS billing, or unrelated modules.

The ERP must include:

- User and role management
- Company and branch setup
- CRM and customer management
- Sales management
- Purchase management
- Inventory and warehouse management
- Accounts and finance
- Employee management
- Approval workflows
- Reports and dashboards
- Notifications
- Audit logs
- Data backup and recovery
- Strong security and encryption
- Import and export tools

The application must contain a working frontend, backend, database, authentication, permissions, validations, business logic, reports, automated tests, and deployment instructions.

Do not create a static prototype. Do not use fake buttons, mock APIs, hard-coded statistics, placeholder screens, or incomplete workflows.

---

# 1. Recommended Technology Stack

Use the following stack unless there is a strong technical reason to change it.

## Frontend

- React
- TypeScript
- Next.js
- Tailwind CSS
- A professional component library such as shadcn/ui
- React Hook Form
- Zod validation
- TanStack Query
- TanStack Table
- Recharts for dashboards

## Backend

- Node.js
- TypeScript
- NestJS
- REST API
- OpenAPI or Swagger documentation
- Background jobs using BullMQ
- Redis for queues, caching, and rate limiting

## Database

- PostgreSQL
- Prisma ORM or TypeORM
- Proper foreign keys, indexes, constraints, and transactions
- Database migrations
- Seed data

## Storage

- Local secure file storage for intranet deployment, or
- S3-compatible object storage for cloud deployment

## Deployment

- Docker
- Docker Compose
- Nginx reverse proxy
- HTTPS
- Environment variables
- Automated database backup

---

# 2. Application Architecture

Create a modular monorepo.

```text
erp-system/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   ├── security/
│   └── config/
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── backups/
├── infrastructure/
│   ├── docker/
│   └── nginx/
├── docs/
└── tests/
```

Use clear separation between:

- Controllers
- Services
- Repositories
- Database models
- Validation
- Permissions
- Accounting logic
- Inventory logic
- Reports
- Notifications
- Background jobs

Use database transactions for every critical stock, payment, invoice, purchase, and accounting operation.

---

# 3. Company Structure

Support one organisation with the following hierarchy:

```text
Company
├── Branches
├── Departments
├── Warehouses
├── Cost Centres
├── Employees
└── Users
```

The system must support:

- One legal company
- Multiple branches
- Multiple departments
- Multiple warehouses
- Multiple storage locations or bins
- Multiple cost centres
- Multiple bank accounts
- Multiple currencies
- Multiple tax codes
- Multiple financial years

Create settings for:

- Company name
- Company logo
- Registration number
- Tax registration number
- Address
- Phone
- Email
- Website
- Base currency
- Financial year
- Date format
- Time zone
- Default tax
- Invoice footer
- Terms and conditions
- Document numbering

---

# 4. User Authentication

Implement secure authentication.

Required features:

- Username or email login
- Secure password storage
- Password reset
- Email verification
- User invitation
- Account activation and deactivation
- Login history
- Active session management
- Logout from all devices
- Failed-login protection
- Account lockout
- Rate limiting
- Optional Google or Microsoft login
- Two-factor authentication using TOTP
- Recovery codes

Passwords must be hashed using Argon2id.

Never store passwords using reversible encryption.

Use:

- Secure HttpOnly cookies
- SameSite cookie protection
- CSRF protection
- Session expiration
- Refresh-token rotation
- Secure logout
- Device and IP logging

---

# 5. Roles and Permissions

Create a role-based access control system.

Default roles:

- System Administrator
- Company Administrator
- General Manager
- Finance Manager
- Accountant
- Sales Manager
- Sales Executive
- Purchase Manager
- Purchase Executive
- Warehouse Manager
- Storekeeper
- HR Manager
- HR Executive
- Department Manager
- Employee
- Internal Auditor
- Read-Only User

Allow the administrator to create custom roles.

Permissions must support:

- View
- Create
- Edit
- Delete
- Submit
- Approve
- Reject
- Cancel
- Post
- Reverse
- Print
- Export
- Import

Permissions must also support restrictions by:

- Branch
- Department
- Warehouse
- Cost centre
- Assigned user
- Document amount
- Approval limit

Sensitive permissions must include:

- View item cost
- View profit margin
- View company financial reports
- View employee salary
- Edit bank details
- Export employee information
- Change security settings
- Manage users and roles
- Reverse posted transactions

All permissions must be enforced in both the frontend and backend.

Never rely only on hiding buttons in the frontend.

---

# 6. Dashboard

Create a role-based dashboard.

## Management Dashboard

Show:

- Total sales
- Total purchases
- Outstanding receivables
- Outstanding payables
- Bank and cash balance
- Gross profit
- Low-stock items
- Pending approvals
- Overdue customer invoices
- Overdue supplier invoices
- Monthly sales trend
- Monthly expense trend
- Top-selling products
- Top customers
- Inventory value

## Sales Dashboard

Show:

- New leads
- Open quotations
- Confirmed sales orders
- Pending deliveries
- Pending invoices
- Customer outstanding
- Sales by executive
- Sales target versus actual

## Purchase Dashboard

Show:

- Open purchase requests
- Pending quotations
- Pending purchase orders
- Pending goods receipts
- Supplier outstanding
- Purchase spend
- Supplier delivery performance

## Inventory Dashboard

Show:

- Current stock
- Low-stock items
- Out-of-stock items
- Expiring batches
- Slow-moving stock
- Stock transfers
- Inventory valuation
- Pending stock adjustments

## Finance Dashboard

Show:

- Cash and bank balances
- Receivables ageing
- Payables ageing
- Revenue
- Expenses
- Profit and loss summary
- Tax payable
- Unreconciled bank entries
- Pending journal approvals

Dashboard information must come from real database transactions.

Do not use hard-coded numbers.

---

# 7. Master Data

Create a central master-data module.

## Customer Master

Fields:

- Customer code
- Customer name
- Customer type
- Contact person
- Phone
- Email
- Billing address
- Shipping address
- Tax registration number
- Payment terms
- Credit limit
- Currency
- Salesperson
- Branch
- Status
- Notes
- Attachments

## Supplier Master

Fields:

- Supplier code
- Supplier name
- Contact person
- Phone
- Email
- Address
- Tax registration number
- Payment terms
- Currency
- Bank details
- Supplier category
- Status
- Notes
- Attachments

## Item Master

Support:

- Stock items
- Non-stock items
- Services
- Consumables
- Fixed assets

Fields:

- Item code
- Barcode
- Item name
- Description
- Item category
- Brand
- Unit of measure
- Purchase unit
- Sales unit
- Unit conversion
- Purchase price
- Selling price
- Minimum selling price
- Tax code
- Reorder level
- Safety stock
- Preferred supplier
- Warehouse
- Bin location
- Batch tracking
- Serial-number tracking
- Expiry tracking
- Active or inactive
- Attachments

## Other Masters

Create:

- Branches
- Departments
- Warehouses
- Warehouse bins
- Units of measure
- Tax codes
- Payment terms
- Currencies
- Exchange rates
- Banks
- Bank accounts
- Cost centres
- Expense categories
- Item categories
- Customer categories
- Supplier categories
- Sales territories
- Document numbering sequences

---

# 8. CRM Module

Keep CRM simple and useful.

Features:

- Leads
- Contacts
- Opportunities
- Sales pipeline
- Follow-up activities
- Calls
- Meetings
- Notes
- Attachments
- Lead source
- Assigned salesperson
- Expected value
- Expected closing date
- Opportunity stage
- Lost reason
- Lead conversion

CRM workflow:

```text
Lead
→ Qualified
→ Opportunity
→ Quotation
→ Sales Order
→ Customer
```

Allow configurable stages.

Provide:

- Lead list
- Kanban pipeline
- Follow-up reminders
- Overdue activity report
- Sales forecast
- Lead conversion report

---

# 9. Sales Module

Implement the complete sales workflow.

## Documents

- Customer enquiry
- Quotation
- Quotation revision
- Sales order
- Delivery note
- Sales invoice
- Customer receipt
- Credit note
- Sales return

## Workflow

```text
Customer Enquiry
→ Quotation
→ Sales Order
→ Stock Reservation
→ Delivery Note
→ Sales Invoice
→ Customer Payment
```

Support:

- Partial delivery
- Partial invoicing
- Backorders
- Customer-specific prices
- Price lists
- Discounts
- Taxes
- Delivery charges
- Payment terms
- Credit limits
- Credit-hold approval
- Salesperson commission
- Customer outstanding
- Quotation expiry
- Recurring invoices
- Sales returns

Sales-order validation:

- Verify customer status
- Verify credit limit
- Verify item availability
- Verify price and minimum margin
- Verify tax
- Verify approval requirement
- Prevent duplicate submission
- Prevent delivery above ordered quantity
- Prevent invoicing above delivered quantity unless authorised

Sales invoice posting must automatically create:

- Customer receivable entry
- Revenue entry
- Tax entry
- Inventory cost entry where applicable
- Cost-of-goods-sold entry where applicable

---

# 10. Purchase Module

Implement the complete purchase workflow.

## Documents

- Purchase request
- Purchase requisition
- Request for quotation
- Supplier quotation
- Supplier quotation comparison
- Purchase order
- Goods receipt note
- Supplier invoice
- Supplier payment
- Purchase return
- Debit note

## Workflow

```text
Purchase Request
→ Approval
→ Request for Quotation
→ Supplier Comparison
→ Purchase Order
→ Goods Receipt Note
→ Supplier Invoice
→ Supplier Payment
```

Support:

- Multiple supplier quotations
- Supplier comparison
- Partial receiving
- Backorders
- Purchase approval
- Supplier price list
- Supplier lead time
- Landed cost
- Purchase return
- Supplier rating
- Three-way matching

Three-way matching must compare:

- Purchase order
- Goods receipt
- Supplier invoice

Flag:

- Quantity variance
- Price variance
- Tax variance
- Duplicate supplier invoice

Do not allow supplier invoices to be posted when matching limits are exceeded without approval.

---

# 11. Inventory and Warehouse Module

Use an immutable stock-ledger design.

Never directly change stock quantity without recording a stock transaction.

## Features

- Stock receipt
- Stock issue
- Stock transfer
- Stock adjustment
- Physical stock count
- Cycle counting
- Stock reservation
- Picking
- Packing
- Delivery
- Goods return
- Multiple warehouses
- Multiple bins
- Batch tracking
- Serial-number tracking
- Expiry-date tracking
- Barcode scanning
- QR-code scanning
- Reorder levels
- Safety stock
- Minimum and maximum stock
- Damaged stock
- Quarantine stock
- Inventory ageing
- Slow-moving stock
- Dead-stock report
- Stock ledger
- Inventory valuation

## Stock Status

Support:

- Available
- Reserved
- In transit
- Quarantine
- Damaged
- Expired

## Inventory Valuation

Support:

- FIFO
- Weighted average

Select one default valuation method in company settings.

Do not allow users to change the valuation method after transactions exist without a controlled migration.

## Inventory Controls

- Prevent negative stock by default
- Allow authorised override
- Use database locking during stock allocation
- Prevent duplicate stock movement
- Prevent delivery beyond available stock
- Prevent serial-number duplication
- Prevent expired stock delivery
- Record batch and serial history
- Record source document for every movement

---

# 12. Accounting and Finance Module

Implement true double-entry accounting.

## Core Features

- Chart of accounts
- General ledger
- Journal entries
- Accounts receivable
- Accounts payable
- Customer invoices
- Supplier invoices
- Customer receipts
- Supplier payments
- Credit notes
- Debit notes
- Cash accounts
- Bank accounts
- Petty cash
- Bank reconciliation
- Expense entries
- Income entries
- Tax entries
- Cost centres
- Budgets
- Recurring journals
- Opening balances
- Financial periods
- Year-end closing
- Multi-currency transactions
- Exchange-rate gain and loss

## Financial Reports

- Trial balance
- General ledger
- Balance sheet
- Profit and loss
- Cash-flow statement
- Customer ageing
- Supplier ageing
- Customer statement
- Supplier statement
- Bank reconciliation
- Tax summary
- Expense report
- Cost-centre report
- Budget versus actual
- Inventory valuation
- Sales profitability

## Accounting Rules

- Every journal entry must balance
- Total debit must equal total credit
- Posted entries cannot be edited
- Corrections must use reversal entries
- Closed accounting periods must reject posting
- Every automatic posting must reference its source document
- Every ledger entry must contain branch and cost centre when applicable
- Monetary values must use fixed decimal types
- Never use floating-point values for money
- Apply consistent rounding rules
- Prevent duplicate posting

## Automatic Accounting

Create configurable accounting mappings for:

- Sales invoice
- Customer receipt
- Sales return
- Credit note
- Purchase invoice
- Supplier payment
- Purchase return
- Debit note
- Goods receipt
- Delivery
- Stock adjustment
- Expense claim
- Payroll journal if payroll is added later

---

# 13. Employee and HR Module

Keep HR focused on employee administration.

## Features

- Employee profile
- Employee code
- Department
- Designation
- Branch
- Manager
- Employment date
- Employment type
- Contact details
- Emergency contact
- Documents
- Skills
- Certifications
- Certification expiry
- Attendance
- Shifts
- Leave types
- Leave requests
- Leave balance
- Holiday calendar
- Expense claims
- Employee onboarding
- Employee offboarding
- Employee self-service

Do not build a complex payroll engine in the first version unless specifically required.

Provide a payroll-ready structure so payroll can be added later.

Sensitive employee fields must use strict permissions and selective field encryption.

---

# 14. Approval Workflow

Create a reusable approval engine.

Apply it to:

- Purchase requests
- Purchase orders
- Sales discounts
- Sales credit-limit override
- Expense claims
- Supplier invoices
- Journal entries
- Stock adjustments
- Customer refunds
- Supplier payments

Approval rules may depend on:

- Document type
- Amount
- Branch
- Department
- Role
- Cost centre
- User
- Discount percentage
- Credit-limit excess

Example:

```text
Purchase up to 1,000
→ Department Manager

Purchase from 1,001 to 10,000
→ Department Manager
→ Finance Manager

Purchase above 10,000
→ Department Manager
→ Finance Manager
→ General Manager
```

Approval features:

- Submit
- Approve
- Reject
- Return for correction
- Add comments
- Delegate approval
- Escalate overdue approval
- Notify approver
- Record complete approval history

Prevent a user from approving their own document when segregation of duties is enabled.

---

# 15. Notifications

Support:

- In-app notifications
- Email notifications
- Optional SMS
- Optional WhatsApp integration

Notification events:

- New approval request
- Approval completed
- Approval rejected
- Quotation expiring
- Sales order pending delivery
- Purchase order pending receipt
- Customer invoice overdue
- Supplier invoice due
- Stock below reorder level
- Batch nearing expiry
- Employee certification expiring
- Failed login alert
- Backup failure
- Integration failure

Allow users to configure notification preferences.

---

# 16. Documents and Attachments

Allow attachments for:

- Customers
- Suppliers
- Items
- Sales documents
- Purchase documents
- Employees
- Expenses
- Journal entries
- Stock transactions

Security requirements:

- Private storage
- Access based on record permission
- File-type validation
- File-size limits
- Malware scanning
- Signed temporary download links
- File version history
- Download audit log

Do not expose private files through public URLs.

---

# 17. Reports and Exports

All modules must provide:

- Search
- Filters
- Sorting
- Grouping
- Pagination
- Saved views
- Configurable columns
- Print
- PDF export
- Excel export
- CSV export

Reports must respect user permissions.

A user must never be able to export records they cannot view in the application.

Prevent spreadsheet formula injection in exported files.

---

# 18. Audit Logs

Create append-only audit logs.

Record:

- Login
- Logout
- Failed login
- Password reset
- User creation
- User deactivation
- Role changes
- Permission changes
- Record creation
- Record update
- Record deletion
- Document submission
- Approval
- Rejection
- Posting
- Reversal
- Export
- File download
- Security setting changes
- Backup activity

Each audit record must contain:

- Event ID
- User
- Action
- Module
- Record type
- Record ID
- Timestamp
- IP address
- User agent
- Before value
- After value
- Reason or comment
- Request correlation ID

Mask passwords, tokens, bank details, encryption keys, and other sensitive values.

Ordinary users must not be able to edit or delete audit logs.

---

# 19. Security and Encryption

Follow defence-in-depth security.

## Data in Transit

- Enforce HTTPS
- Use TLS 1.2 or newer
- Prefer TLS 1.3
- Enable HSTS
- Use secure cookies
- Verify third-party certificates
- Sign and verify webhooks

## Data at Rest

Encrypt:

- Database storage
- Backup files
- Uploaded documents
- Server disks

## Field-Level Encryption

Use AES-256-GCM or another well-reviewed authenticated encryption method for highly sensitive fields such as:

- Bank account numbers
- Employee identification numbers
- Salary information
- Integration credentials
- API secrets
- Tax identification details where necessary

Use envelope encryption with a managed key system.

Do not invent custom encryption.

## Password Security

- Hash passwords using Argon2id
- Never encrypt passwords
- Never log passwords
- Never send passwords by email
- Support secure reset links
- Expire reset tokens

## Application Security

Protect against:

- SQL injection
- Cross-site scripting
- CSRF
- Broken access control
- Insecure direct object references
- Server-side request forgery
- Path traversal
- Command injection
- Malicious uploads
- Open redirects
- Session fixation
- Brute-force login
- Duplicate API requests
- Mass assignment
- Race conditions

Use:

- Input validation
- Output encoding
- Parameterised queries
- DTO validation
- Content Security Policy
- CORS allow-list
- Request-size limits
- Rate limiting
- Secure HTTP headers
- Dependency vulnerability scanning
- Secret scanning
- File scanning
- Idempotency keys for critical operations

Never store secrets in source code.

Never expose backend secrets in frontend environment variables.

---

# 20. Backup and Recovery

Implement:

- Daily automated database backup
- Configurable backup schedule
- Encrypted backup files
- Backup retention policy
- File-storage backup
- Manual backup
- Point-in-time recovery where supported
- Restore procedure
- Backup success notification
- Backup failure alert
- Backup restore testing
- Disaster-recovery documentation

A backup must not be considered successful until restoration has been tested.

---

# 21. Import and Migration

Provide import templates for:

- Customers
- Suppliers
- Items
- Opening stock
- Chart of accounts
- Opening balances
- Employees
- Price lists

Import process:

```text
Upload
→ Map Columns
→ Validate
→ Preview
→ Confirm
→ Import
→ Download Error Report
```

Requirements:

- Validate required columns
- Detect duplicate records
- Validate tax codes
- Validate units of measure
- Validate customer and supplier codes
- Validate opening stock
- Validate opening balances
- Ensure opening debit equals opening credit
- Process large imports in background jobs
- Allow download of failed rows
- Maintain import audit logs

---

# 22. Search and User Experience

Create a professional and simple ERP interface.

## Main Layout

- Collapsible sidebar
- Top search bar
- Branch selector
- Notification centre
- User profile
- Breadcrumbs
- Quick-create menu
- Light and dark mode

## Table Features

- Search
- Filters
- Pagination
- Sorting
- Column selection
- Column resizing
- Bulk actions
- Export
- Saved views

## Form Features

- Clear section grouping
- Inline validation
- Unsaved-change warning
- Draft saving
- Attachments
- Comments
- Activity timeline
- Approval history
- Related documents

Keep navigation simple.

Do not create too many nested menus.

---

# 23. Optional Integrations

Create a clean integration layer, but do not make integrations mandatory for the first version.

Prepare connectors for:

- Tally
- Banks
- Payment gateways
- Email
- SMS
- WhatsApp
- Barcode scanners
- Biometric attendance systems
- WooCommerce
- Shopify

## Tally Integration

Prepare support for:

- Customer synchronisation
- Supplier synchronisation
- Item synchronisation
- Sales invoice export
- Purchase invoice export
- Receipt export
- Payment export
- Journal export
- Stock data exchange
- XML-based communication
- Duplicate prevention
- Mapping settings
- Sync queue
- Retry handling
- Reconciliation report
- Sync error log

Do not allow a failed Tally sync to create partial or duplicate accounting entries.

---

# 24. Testing Requirements

Create:

- Unit tests
- API tests
- Database integration tests
- Frontend tests
- End-to-end tests
- Permission tests
- Inventory tests
- Accounting tests
- Approval workflow tests
- Security tests
- Import tests
- Backup and restore tests

Mandatory test scenarios:

1. Unauthorised users cannot access restricted modules.
2. Users cannot bypass permissions by modifying API requests.
3. Sales order creates correct reservation.
4. Delivery reduces inventory correctly.
5. Sales invoice creates balanced accounting entries.
6. Purchase receipt increases inventory correctly.
7. Supplier invoice creates balanced accounting entries.
8. Stock transfer preserves total company stock.
9. Sales return reverses stock and accounting correctly.
10. Purchase return reverses stock and accounting correctly.
11. Concurrent requests cannot allocate the same stock twice.
12. Closed-period transactions are rejected.
13. Posted transactions cannot be edited.
14. Approval thresholds work correctly.
15. Sensitive fields are hidden from unauthorised users.
16. Audit logs are created.
17. MFA works.
18. Expired sessions are rejected.
19. Export permissions are enforced.
20. Duplicate posting is prevented.
21. Database backup can be restored.

---

# 25. Deployment

Create a production-ready Docker deployment.

Services:

- Web frontend
- Backend API
- PostgreSQL
- Redis
- Background worker
- Nginx
- Backup service

Provide:

- Dockerfiles
- Docker Compose
- `.env.example`
- Database migration commands
- Seed commands
- Development startup commands
- Production startup commands
- Backup commands
- Restore commands
- Health-check endpoints
- Log rotation
- Error monitoring
- Database monitoring
- Queue monitoring

Production rules:

- Run containers as non-root
- Restrict database network access
- Use least-privilege database users
- Use HTTPS
- Store secrets securely
- Disable debug mode
- Hide stack traces from users
- Enable structured logging
- Enable automated backups
- Configure firewall rules
- Configure CORS properly

---

# 26. Development Phases

Develop the ERP in controlled phases.

## Phase 1 — Foundation

Build:

- Project structure
- Authentication
- Two-factor authentication
- Company settings
- Branches
- Departments
- Users
- Roles
- Permissions
- Audit logs
- Dashboard layout

## Phase 2 — Master Data

Build:

- Customers
- Suppliers
- Items
- Categories
- Units
- Warehouses
- Bins
- Taxes
- Currencies
- Payment terms
- Cost centres
- Imports

## Phase 3 — Sales and CRM

Build:

- Leads
- Opportunities
- Quotations
- Sales orders
- Deliveries
- Sales invoices
- Receipts
- Sales returns
- Credit notes

## Phase 4 — Purchase and Inventory

Build:

- Purchase requests
- RFQs
- Supplier comparison
- Purchase orders
- Goods receipts
- Supplier invoices
- Purchase returns
- Stock transfers
- Stock counts
- Stock adjustments
- Inventory valuation

## Phase 5 — Accounting

Build:

- Chart of accounts
- General ledger
- Receivables
- Payables
- Payments
- Bank reconciliation
- Taxes
- Financial periods
- Financial statements
- Automatic posting

## Phase 6 — HR and Approvals

Build:

- Employee records
- Leave
- Attendance
- Expense claims
- Approval workflows
- Notifications

## Phase 7 — Reports and Integrations

Build:

- Dashboards
- Operational reports
- Financial reports
- Excel and PDF exports
- Email notifications
- Tally integration foundation
- API documentation

## Phase 8 — Security and Release

Complete:

- Security review
- Permission review
- Performance tests
- Backup restoration test
- Production deployment
- User documentation
- Administrator documentation
- Final acceptance testing

At the end of every phase:

1. Run migrations.
2. Run linting.
3. Run type checking.
4. Run automated tests.
5. Fix all failures.
6. Run security scans.
7. Update documentation.
8. Provide exact startup commands.
9. List completed functionality.
10. List remaining work honestly.

---

# 27. AI Coding Rules

The AI coding agent must follow these rules.

- Do not generate only frontend screens.
- Do not create fake APIs.
- Do not hard-code dashboard values.
- Do not bypass backend permission checks.
- Do not store passwords in plaintext.
- Do not expose secrets.
- Do not use floating-point values for money.
- Do not directly edit posted ledger entries.
- Do not directly edit stock balances.
- Do not ignore database transactions.
- Do not disable TypeScript checks.
- Do not hide errors using empty catch blocks.
- Do not use unnecessary `any` types.
- Do not remove security controls to fix errors.
- Do not claim a feature is complete when it contains placeholders.
- Do not skip automated tests.
- Do not build unnecessary SaaS or multi-tenant features.

Use:

- Strict TypeScript
- Clean architecture
- Reusable modules
- Clear naming
- DTO validation
- Database constraints
- Transactions
- Audit logs
- Secure defaults
- Proper error handling
- Structured logging
- Automated tests
- API documentation

Before modifying existing code:

1. Read the related module.
2. Understand dependencies.
3. Identify affected workflows.
4. Explain the planned change.
5. Update tests.
6. Run all related tests.
7. Confirm no existing workflow is broken.

---

# 28. Demo Data

Create one demo company.

Example:

```text
Company Name: Eversafe Demo Company
Base Currency: SGD
Financial Year: January to December
```

Create sample:

- Company
- Two branches
- Three departments
- Two warehouses
- Ten users
- Customers
- Suppliers
- Items
- Opening stock
- Chart of accounts
- Quotations
- Sales orders
- Purchase orders
- Goods receipts
- Customer invoices
- Supplier invoices
- Payments
- Employees
- Approval workflow

Clearly mark seeded data as demonstration data.

---

# 29. Final Acceptance Criteria

The ERP is complete only when:

- Administrator can configure the company.
- Administrator can create branches and departments.
- Administrator can create users and roles.
- Permissions are enforced in the frontend and backend.
- Customers, suppliers, and items can be managed.
- CRM workflow works.
- Sales workflow works from quotation to payment.
- Purchase workflow works from request to payment.
- Inventory stock ledger works.
- Warehouse transfers work.
- Stock valuation works.
- Sales returns work.
- Purchase returns work.
- Accounting entries remain balanced.
- Posted entries cannot be edited.
- Approval workflows work.
- Financial reports match ledger entries.
- Dashboards show real data.
- Audit logs are generated.
- Two-factor authentication works.
- Sensitive data is encrypted.
- Backups can be restored.
- Docker deployment works.
- Automated tests pass.
- No critical security issue remains.
- No mock API or fake button remains.
- Setup documentation is complete.
- User documentation is complete.

---

# 30. First Task for the AI Coding Agent

Begin with Phase 1.

Before writing application code, produce:

1. Product Requirements Document
2. System architecture
3. Database entity relationship diagram
4. Module dependency map
5. Role and permission matrix
6. Security threat model
7. Repository folder structure
8. Environment-variable template
9. Database schema plan
10. Development checklist

Then create the working project foundation.

Do not move to the next phase until:

- The current phase works
- Tests pass
- Permissions are verified
- Documentation is updated
- The system can be started successfully
