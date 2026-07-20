export type UserStatus = "ACTIVE" | "INVITED" | "LOCKED" | "DISABLED";

export type ApiUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  status: UserStatus;
  roles: string[];
  permissions: string[];
};

export type DashboardSummary = {
  users: number;
  roles: number;
  branches: number;
  departments: number;
  warehouses: number;
  pendingApprovals: number;
  auditEventsToday: number;
  failedLoginsToday: number;
};

export type CompanySettings = {
  id: string;
  name: string;
  logoUrl: string | null;
  registrationNumber: string | null;
  taxRegistrationNumber: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  baseCurrency: string;
  timezone: string;
  dateFormat: string;
  financialYearStartMonth: number;
  defaultTaxCode: string | null;
  invoiceFooter: string | null;
  termsAndConditions: string | null;
};
