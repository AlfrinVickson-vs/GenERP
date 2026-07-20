# Database Schema Plan

## Phase 1 Tables

- `companies`
- `branches`
- `departments`
- `warehouses`
- `cost_centers`
- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `login_history`
- `audit_logs`
- `approval_rules`
- `notifications`

## Constraints and Indexes

- Unique company singleton marker.
- Unique user email and username.
- Unique role name.
- Unique permission code.
- Foreign keys from organisation records to company and branch.
- Indexes on audit timestamp, audit module, login user, and login timestamp.

## Phase 2+ Expansion

Master data will add customers, suppliers, items, tax codes, units, currencies, banks, bins, and import jobs. Transactional phases will add immutable stock ledger and double-entry general ledger tables with strict posting constraints.
