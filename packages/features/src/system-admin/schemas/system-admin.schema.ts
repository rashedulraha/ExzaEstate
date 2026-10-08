import { z } from 'zod';

export interface SystemHealthMetrics {
  status: 'ok' | 'degraded';
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  queueDepth: {
    pending: number;
    active: number;
    completed: number;
    failed: number;
  };
  backupStatus: {
    status: string;
    lastBackupAt: string;
  };
  errorRates: {
    lastHourErrors: number;
    errorRatePercent: number;
  };
}

export type SystemHealthData = SystemHealthMetrics;

export interface TenantBranch {
  id: string;
  name: string;
  code: string;
  isHeadOffice: boolean;
}

export interface TenantItem {
  id: string;
  name: string;
  code: string;
  timezone: string;
  isActive: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  branches?: TenantBranch[];
}

export const onboardTenantSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  code: z
    .string()
    .min(2, 'Company code is required')
    .regex(/^[A-Z0-9_-]+$/i, 'Code must be alphanumeric'),
  timezone: z.string(),
  branchName: z.string().optional(),
  branchCode: z.string().optional(),
  managingDirector: z.object({
    fullName: z.string().min(2, 'Managing Director name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    phone: z.string().optional(),
  }),
});

export type OnboardTenantFormData = z.infer<typeof onboardTenantSchema>;

export const generateLicenseSchema = z.object({
  companyId: z.string().min(1, 'Please select a company'),
  plan: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE', 'CUSTOM']),
  validUntil: z.string().min(1, 'Expiry date is required'),
  maxSeats: z.number().int().min(1, 'Minimum 1 seat required'),
  maxBranches: z.number().int().min(1).optional(),
  maxProjects: z.number().int().min(1).optional(),
  machineId: z.string().optional(),
});

export type GenerateLicenseFormData = z.infer<typeof generateLicenseSchema>;

export interface GeneratedLicenseResult {
  licenseKey: string;
  signature: string;
  payload: {
    companyId: string;
    plan: string;
    validUntil: string;
    maxSeats: number;
    maxBranches?: number;
    maxProjects?: number;
    machineId?: string;
    issuedAt: string;
  };
}

export interface PlatformLicenseItem {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  licenseKey: string;
  plan: string;
  status: string;
  validFrom: string;
  validUntil: string;
  maxSeats: number;
  maxBranches: number;
  maxProjects: number;
  machineId?: string | null;
  signature: string;
  createdAt: string;
}

export interface PlatformAuditLogItem {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  module: string;
  action: string;
  recordType: string;
  reason?: string | null;
  createdAt: string;
}
