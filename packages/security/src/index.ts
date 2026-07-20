export const PERMISSIONS = {
  ALL: "*",
  DASHBOARD_VIEW: "dashboard.view",
  COMPANY_VIEW: "company.view",
  COMPANY_EDIT: "company.edit",
  BRANCH_VIEW: "branch.view",
  BRANCH_CREATE: "branch.create",
  BRANCH_EDIT: "branch.edit",
  BRANCH_DELETE: "branch.delete",
  DEPARTMENT_VIEW: "department.view",
  DEPARTMENT_CREATE: "department.create",
  DEPARTMENT_EDIT: "department.edit",
  DEPARTMENT_DELETE: "department.delete",
  WAREHOUSE_VIEW: "warehouse.view",
  WAREHOUSE_CREATE: "warehouse.create",
  WAREHOUSE_EDIT: "warehouse.edit",
  WAREHOUSE_DELETE: "warehouse.delete",
  MASTER_DATA_VIEW: "master_data.view",
  MASTER_DATA_EDIT: "master_data.edit",
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_CREATE: "customer.create",
  CUSTOMER_EDIT: "customer.edit",
  SUPPLIER_VIEW: "supplier.view",
  SUPPLIER_CREATE: "supplier.create",
  SUPPLIER_EDIT: "supplier.edit",
  ITEM_VIEW: "item.view",
  ITEM_CREATE: "item.create",
  ITEM_EDIT: "item.edit",
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_EDIT: "inventory.edit",
  CRM_VIEW: "crm.view",
  CRM_EDIT: "crm.edit",
  SALES_VIEW: "sales.view",
  SALES_EDIT: "sales.edit",
  PURCHASE_VIEW: "purchase.view",
  PURCHASE_EDIT: "purchase.edit",
  ACCOUNTING_VIEW: "accounting.view",
  ACCOUNTING_EDIT: "accounting.edit",
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  INTEGRATION_VIEW: "integration.view",
  HR_VIEW: "hr.view",
  HR_EDIT: "hr.edit",
  APPROVAL_VIEW: "approval.view",
  APPROVAL_ACTION: "approval.action",
  NOTIFICATION_VIEW: "notification.view",
  COST_CENTER_VIEW: "cost_center.view",
  COST_CENTER_CREATE: "cost_center.create",
  COST_CENTER_EDIT: "cost_center.edit",
  COST_CENTER_DELETE: "cost_center.delete",
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_EDIT: "user.edit",
  USER_DELETE: "user.delete",
  ROLE_VIEW: "role.view",
  ROLE_CREATE: "role.create",
  ROLE_EDIT: "role.edit",
  ROLE_DELETE: "role.delete",
  AUDIT_VIEW: "audit.view",
  SECURITY_SETTINGS_CHANGE: "security_settings.change",
  FINANCIAL_REPORTS_VIEW: "financial_reports.view",
  EMPLOYEE_SALARY_VIEW: "employee_salary.view",
  EMPLOYEE_INFORMATION_EXPORT: "employee_information.export",
  BANK_DETAILS_EDIT: "bank_details.edit",
  POSTED_TRANSACTIONS_REVERSE: "posted_transactions.reverse"
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function hasPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes(PERMISSIONS.ALL)) {
    return true;
  }

  if (userPermissions.includes(required)) {
    return true;
  }

  const [module] = required.split(".");
  return userPermissions.includes(`${module}.*`);
}

export function hasEveryPermission(userPermissions: string[], required: string[]): boolean {
  return required.every((permission) => hasPermission(userPermissions, permission));
}

const SENSITIVE_KEYS = [
  "password",
  "passwordHash",
  "token",
  "secret",
  "mfaSecret",
  "bankAccount",
  "apiKey",
  "encryptionKey"
];

export function maskSensitive<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => maskSensitive(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        const shouldMask = SENSITIVE_KEYS.some((sensitiveKey) =>
          key.toLowerCase().includes(sensitiveKey.toLowerCase())
        );
        return [key, shouldMask ? "[MASKED]" : maskSensitive(entry)];
      })
    ) as T;
  }

  return value;
}
