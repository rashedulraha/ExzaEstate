import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  roleIds: z.array(z.string().uuid()).min(1, 'At least one role is required'),
  branchIds: z.array(z.string().uuid()).optional(),
  defaultBranchId: z.string().uuid().optional(),
  temporaryPassword: z.string().min(8, 'Temporary password must be at least 8 characters'),
  mustChangePassword: z.boolean().default(true),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const inviteUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  roleId: z.string().uuid('Role is required'),
  branchIds: z.array(z.string().uuid()).optional(),
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;

export const updateUserRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()).min(1, 'At least one role is required'),
});

export type UpdateUserRolesFormData = z.infer<typeof updateUserRolesSchema>;

export const userBranchAssignmentSchema = z.object({
  branchId: z.string().uuid(),
  isDefault: z.boolean(),
});

export const updateUserBranchesSchema = z.object({
  branches: z.array(userBranchAssignmentSchema).min(1, 'At least one branch is required'),
});

export type UpdateUserBranchesFormData = z.infer<typeof updateUserBranchesSchema>;

export interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isTwoFactorEnabled: boolean;
  roles: Array<{ id: string; code: string; name: string }>;
  branches: Array<{ id: string; code: string; name: string; isDefault: boolean }>;
  createdAt: string;
  lastLoginAt?: string | null;
}
