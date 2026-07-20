# Product Requirements Document

## Objective

Build a secure single-company ERP for one legal organisation with multiple branches, departments, warehouses, users, and roles. Phase 1 establishes the foundation required before business modules are added.

## Phase 1 Scope

- Authentication with secure password hashing, session cookies, login history, account lockout counters, and optional TOTP MFA fields.
- Company settings for one legal entity.
- Branch, department, warehouse, and cost centre setup.
- User, role, and permission administration.
- Backend-enforced role-based access control.
- Append-only audit logs for security and administrative actions.
- Role-aware dashboard shell backed by database queries.
- Docker-based local stack with PostgreSQL, Redis, API, web, worker, Nginx, and backup service definitions.
- Seed data for Eversafe Demo Company.

## Out of Scope for Phase 1

- CRM, sales, purchasing, inventory movements, accounting postings, HR workflows, imports, exports, and integrations.
- Payroll and multi-tenant SaaS features.
- Production email/SMS delivery.

## Users

- System Administrator configures the system and security.
- Company Administrator manages company structure and master setup.
- General Manager views operational dashboard data.
- Finance, Sales, Purchase, Warehouse, HR, Auditor, and Employee users receive role-specific permissions for later modules.

## Non-Functional Requirements

- TypeScript strict mode.
- Server-side permission checks for every protected endpoint.
- Argon2id password hashing.
- Database constraints and indexes for critical identities and foreign keys.
- Append-only audit trail.
- Environment-based configuration.
- Automated tests for permission enforcement and authentication primitives.
