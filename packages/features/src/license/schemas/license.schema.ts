import { z } from 'zod';

export const activateLicenseSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  licenseKey: z.string().min(5, 'Valid license key is required (e.g. EXZA-PRO-XXXX)'),
  plan: z.string().min(2, 'Plan name is required'),
  validUntil: z.string().min(1, 'Expiration date is required'),
  maxSeats: z.number().int().min(1, 'At least 1 seat is required'),
  signature: z.string().min(10, 'Cryptographic signature is required'),
});

export type ActivateLicenseInput = z.infer<typeof activateLicenseSchema>;

export const transferLicenseSchema = z.object({
  licenseKey: z.string().min(5, 'Current license key is required'),
  reason: z.string().min(5, 'Reason for hardware transfer is required (min 5 characters)'),
});

export type TransferLicenseInput = z.infer<typeof transferLicenseSchema>;

export const renewLicenseSchema = z.object({
  licenseKey: z.string().min(5, 'Renewed license key is required'),
  validUntil: z.string().min(1, 'Renewed expiration date is required'),
  signature: z.string().min(10, 'Cryptographic signature is required'),
});

export type RenewLicenseInput = z.infer<typeof renewLicenseSchema>;
