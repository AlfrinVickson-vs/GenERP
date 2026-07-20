export const PERMISSIONS = {
  ALL: "*",
  DASHBOARD_VIEW: "dashboard.view",
  COMPANY_VIEW: "company.view",
  COMPANY_EDIT: "company.edit",
  BRANCH_VIEW: "branch.view",
  BRANCH_CREATE: "branch.create",
  BRANCH_EDIT: "branch.edit",
  DEPARTMENT_VIEW: "department.view",
  DEPARTMENT_CREATE: "department.create",
  WAREHOUSE_VIEW: "warehouse.view",
  WAREHOUSE_CREATE: "warehouse.create",
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
  FINANCIAL_REPORTS_VIEW: "financial_reports.view",
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
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_EDIT: "user.edit",
  ROLE_VIEW: "role.view",
  ROLE_CREATE: "role.create",
  AUDIT_VIEW: "audit.view"
} as const;

export function hasPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes(PERMISSIONS.ALL)) return true;
  if (userPermissions.includes(required)) return true;
  const [module] = required.split(".");
  return userPermissions.includes(`${module}.*`);
}

export function hasEveryPermission(userPermissions: string[], required: string[]): boolean {
  return required.every((permission) => hasPermission(userPermissions, permission));
}

const sensitiveKeys = ["password", "passwordHash", "token", "secret", "mfaSecret", "bankAccount", "apiKey"];

export function maskSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => maskSensitive(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sensitiveKeys.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey.toLowerCase()))
          ? "[MASKED]"
          : maskSensitive(entry)
      ])
    );
  }

  return value;
}
