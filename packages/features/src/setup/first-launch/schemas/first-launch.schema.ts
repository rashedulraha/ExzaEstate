import { z } from 'zod';

export type RuntimeModeChoice = 'cloud' | 'local';
export type LocalSetupAction = 'new_company' | 'restore_backup';

export const cloudConfigSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name cannot exceed 100 characters'),
  licenseKey: z.string().trim().min(8, 'Valid license key from purchase receipt is required'),
  baseUrl: z.string().trim(),
});

export type CloudConfigInput = z.infer<typeof cloudConfigSchema>;

export const createLocalCompanySchema = z
  .object({
    licenseKey: z.string().trim().min(8, 'Valid license key from purchase receipt is required'),
    companyName: z
      .string()
      .trim()
      .min(2, 'Company name must be at least 2 characters')
      .max(100, 'Company name cannot exceed 100 characters'),
    companyCode: z
      .string()
      .trim()
      .min(2, 'Company code must be at least 2 characters')
      .max(10, 'Company code cannot exceed 10 characters')
      .regex(/^[A-Za-z0-9]+$/, 'Company code must be alphanumeric (letters and numbers only)'),
    tradeLicense: z.string().trim().optional(),
    adminName: z.string().trim().min(2, 'Administrator full name is required'),
    adminEmail: z.string().trim().email('Valid administrator email address is required'),
    phone: z.string().trim().optional(),
    verificationCode: z.string().trim().optional(),
    adminPassword: z.string().min(8, 'Administrator password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type CreateLocalCompanyInput = z.infer<typeof createLocalCompanySchema>;

export const restoreBackupSchema = z.object({
  backupFilePath: z.string().trim().min(1, 'Please select a valid .exzabackup archive file'),
});

export type RestoreBackupInput = z.infer<typeof restoreBackupSchema>;
