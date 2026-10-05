import { z } from 'zod';

export const rolePermissionItemSchema = z.object({
  permissionCode: z.string().min(1),
  scope: z.enum(['OWN', 'TEAM', 'BRANCH', 'ALL']).optional(),
});

export type RolePermissionItem = z.infer<typeof rolePermissionItemSchema>;

export const createRoleSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[A-Z0-9_]+$/, 'Code must contain only uppercase letters, numbers, and underscores'),
  name: z.string().min(2).max(128),
  description: z.string().max(255).optional(),
  permissions: z.array(rolePermissionItemSchema).optional(),
});

export type CreateRoleFormData = z.infer<typeof createRoleSchema>;

export const cloneRoleSchema = z.object({
  newCode: z
    .string()
    .min(2)
    .max(64)
    .regex(
      /^[A-Z0-9_]+$/,
      'New code must contain only uppercase letters, numbers, and underscores',
    ),
  newName: z.string().min(2).max(128),
  description: z.string().max(255).optional(),
});

export type CloneRoleFormData = z.infer<typeof cloneRoleSchema>;

export const updateRolePermissionsSchema = z.object({
  permissions: z.array(rolePermissionItemSchema),
});

export type UpdateRolePermissionsFormData = z.infer<typeof updateRolePermissionsSchema>;

export interface RoleItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  userCount?: number;
  permissions?: RolePermissionItem[];
  updatedAt: string;
}
