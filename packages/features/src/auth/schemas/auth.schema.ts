import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  captchaToken: z.string().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const totpVerificationSchema = z.object({
  token: z
    .string()
    .trim()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});

export type TotpVerificationFormData = z.infer<typeof totpVerificationSchema>;

export const enable2FaSchema = z.object({
  secret: z.string().min(1, 'Secret is required'),
  token: z
    .string()
    .trim()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});

export type Enable2FaFormData = z.infer<typeof enable2FaSchema>;
