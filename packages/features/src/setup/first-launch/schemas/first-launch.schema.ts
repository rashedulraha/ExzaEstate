import { z } from 'zod';

export type RuntimeModeChoice = 'cloud' | 'local';
export type LocalSetupAction = 'new_company' | 'restore_backup';

export const cloudConfigSchema = z.object({
  baseUrl: z.string().trim().min(1, 'API Server URL is required'),
});

export type CloudConfigInput = z.infer<typeof cloudConfigSchema>;

export const createLocalCompanySchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(2, 'Company name must be at least 2 characters')
      .max(100, 'Company name cannot exceed 100 characters'),
    tradeLicense: z.string().trim().optional(),
    adminName: z.string().trim().min(2, 'Administrator name must be at least 2 characters'),
    adminEmail: z.string().trim().email('Please enter a valid corporate email address'),
    adminPassword: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(8, 'Confirm password is required'),
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
