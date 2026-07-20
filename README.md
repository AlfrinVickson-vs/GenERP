# GENSIS ERP

GENSIS ERP is a single-company ERP demo application for managing company setup, branches, users, roles, permissions, master data, sales, purchasing, inventory, accounting, HR, reports, and integrations.

The project is built as a Node.js monorepo with:

- `apps/web` - Next.js web interface
- `apps/api` - NestJS API
- `apps/worker` - background worker foundation
- `packages/*` - shared config, security, types, UI, and validation packages

## Features

- Company profile, branding, logo/icon, address, currency, timezone, invoice footer, and terms setup
- Branches, departments, warehouses, and cost centers
- User creation and custom role permissions with checkbox-based access control
- Master data for customers, suppliers, items, categories, tax codes, units, currencies, and payment terms
- Sales workflow including leads, opportunities, quotations, orders, deliveries, invoices, receipts, credit notes, and returns
- Purchasing workflow including requests, RFQs, supplier quotes, purchase orders, goods receipts, supplier invoices, and returns
- Inventory stock balances, ledger, valuation, opening stock, transfers, counts, adjustments, and bulk import
- Accounting, journals, source posting, supplier payments, tax summary, trial balance, ageing, and financial statements
- HR employees, leave, attendance, expenses, approvals, notifications, checklists, holidays, and certification alerts
- Dashboard, operational reports, financial reports, exports, scheduled email delivery logs, and Tally export foundation

## Demo Login

Seeded demo credentials:

```text
Username: admin
Password: Admin123!
```

Change this before sharing a public demo link.

## Requirements

- Node.js 20.11 or newer
- npm
- PostgreSQL for production/cloud deployment
- SQLite local demo support is included through the local Prisma schema/scripts

## Local Setup

Install dependencies:

```bash
npm install
```

For the local SQLite demo database:

```bash
npm run prisma:generate:sqlite -w @erp/api
npm run prisma:push:sqlite -w @erp/api
npm run prisma:seed -w @erp/api
```

Start the API:

```bash
set SQLITE_DATABASE_URL=file:./dev.db
set DATABASE_URL=file:./dev.db
set JWT_ACCESS_SECRET=local-development-jwt-secret-change-me-32
set COOKIE_SECRET=local-development-cookie-secret-change-me-32
set COOKIE_SECURE=false
set WEB_ORIGIN=http://localhost:3000
set UPLOAD_DIR=storage/uploads
npm run start -w @erp/api
```

Start the web app in another terminal:

```bash
npm run dev -w @erp/web
```

Open:

- Web app: `http://localhost:3000`
- API docs: `http://localhost:4000/docs`

## Useful Commands

```bash
npm run typecheck
npm run test
npm run build
```

Run only one workspace:

```bash
npm run typecheck -w @erp/web
npm run typecheck -w @erp/api
npm run test -w @erp/api
```

## Cloud Demo Hosting

For a temporary client demo, see:

[docs/client-demo-hosting-guide.md](docs/client-demo-hosting-guide.md)

The recommended simple demo path is Render with:

- one PostgreSQL database
- one API web service
- one web app service

Free demo hosting is not production hosting. Free services may sleep after inactivity, and free databases may be temporary.

## Client Manual

The client-facing manual is available at:

[docs/client-manual/GENSIS ERP Client Manual.docx](<docs/client-manual/GENSIS ERP Client Manual.docx>)

It includes screenshots, module coverage, workflow notes, super admin setup, and review questions for client approval.

## Project Notes

- Do not commit real `.env` files or production secrets.
- Do not use the seeded demo password in production.
- File uploads on temporary/free cloud environments may not be persistent unless proper object storage is configured.
- Use paid database hosting and backup policies before storing real client data.
