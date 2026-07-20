import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(8),
  totpCode: z.string().optional()
});

export const companySettingsSchema = z.object({
  name: z.string().min(2),
  registrationNumber: z.string().optional().nullable(),
  taxRegistrationNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  baseCurrency: z.string().length(3),
  timezone: z.string().min(2),
  dateFormat: z.string().min(4),
  financialYearStartMonth: z.number().int().min(1).max(12),
  defaultTaxCode: z.string().optional().nullable(),
  invoiceFooter: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable()
});

export const organisationUnitSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(120),
  branchId: z.string().optional().nullable(),
  isActive: z.boolean().default(true)
});
