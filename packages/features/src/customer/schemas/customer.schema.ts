import { z } from 'zod';

export const KYC_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'] as const;
export type KycStatusEnum = (typeof KYC_STATUSES)[number];

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(255),
  phone: z
    .string()
    .trim()
    .min(10, 'Valid phone number is required')
    .max(20, 'Phone cannot exceed 20 characters'),
  email: z.string().trim().email('Valid email address is required').optional().or(z.literal('')),
  nid: z
    .string()
    .trim()
    .min(10, 'Bangladeshi NID must be 10, 13, or 17 digits')
    .max(17, 'NID cannot exceed 17 digits'),
  fatherName: z.string().trim().optional().or(z.literal('')),
  motherName: z.string().trim().optional().or(z.literal('')),
  spouseName: z.string().trim().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  occupation: z.string().trim().optional().or(z.literal('')),
  tin: z.string().trim().optional().or(z.literal('')),
  emergencyContact: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().min(5, 'Primary address is required'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const coBuyerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().trim().min(10, 'Valid phone number required'),
  email: z.string().trim().email().optional().or(z.literal('')),
  nid: z.string().trim().min(10, 'NID must be at least 10 digits'),
  relation: z.string().trim().min(2, 'Relationship required (e.g. Spouse, Brother)'),
  sharePercentage: z.number().min(1).max(100, 'Share must be 1-100%'),
});

export type CoBuyerInput = z.infer<typeof coBuyerSchema>;

export const nomineeSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().trim().min(10, 'Valid phone number required'),
  nid: z.string().trim().min(10, 'NID must be at least 10 digits'),
  relation: z.string().trim().min(2, 'Relationship required'),
  sharePercentage: z.number().min(1).max(100, 'Share must be 1-100%'),
});

export type NomineeInput = z.infer<typeof nomineeSchema>;

export const verifyKycSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED'] as const),
  remarks: z.string().trim().min(5, 'Audited remarks required (min 5 characters)'),
});

export type VerifyKycInput = z.infer<typeof verifyKycSchema>;
