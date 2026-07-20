# Role and Permission Matrix

Permission codes use `module.action`, with optional sensitive capability flags.

| Role | Phase 1 Permissions |
| --- | --- |
| System Administrator | `*` |
| Company Administrator | `company.view`, `company.edit`, `branch.*`, `department.*`, `warehouse.*`, `cost_center.*`, `user.*`, `role.*`, `audit.view`, `dashboard.view` |
| General Manager | `company.view`, `branch.view`, `department.view`, `warehouse.view`, `dashboard.view`, `audit.view` |
| Finance Manager | `dashboard.view`, `company.view`, `audit.view`, `finance_reports.view` |
| Accountant | `dashboard.view`, `company.view` |
| Sales Manager | `dashboard.view`, `company.view` |
| Sales Executive | `dashboard.view` |
| Purchase Manager | `dashboard.view`, `company.view` |
| Purchase Executive | `dashboard.view` |
| Warehouse Manager | `dashboard.view`, `warehouse.view` |
| Storekeeper | `dashboard.view`, `warehouse.view` |
| HR Manager | `dashboard.view`, `department.view`, `employee_sensitive.view` |
| HR Executive | `dashboard.view`, `department.view` |
| Department Manager | `dashboard.view`, `department.view` |
| Employee | `dashboard.view` |
| Internal Auditor | `dashboard.view`, `audit.view`, `company.view` |
| Read-Only User | `dashboard.view`, `company.view` |

Sensitive permissions reserved from Phase 1 onward:

- `security_settings.change`
- `users.manage`
- `roles.manage`
- `employee_salary.view`
- `employee_information.export`
- `bank_details.edit`
- `financial_reports.view`
- `posted_transactions.reverse`
