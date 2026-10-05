import { z } from 'zod';

export const PROPERTY_TYPES = ['PLOT', 'FLAT', 'SHOP', 'OFFICE', 'PARKING'] as const;
export type PropertyTypeEnum = (typeof PROPERTY_TYPES)[number];

export const FACING_DIRECTIONS = [
  'NORTH',
  'SOUTH',
  'EAST',
  'WEST',
  'NORTH_EAST',
  'SOUTH_EAST',
  'NORTH_WEST',
  'SOUTH_WEST',
] as const;
export type FacingDirectionEnum = (typeof FACING_DIRECTIONS)[number];

export const OWNER_TYPES = ['COMPANY', 'LANDOWNER'] as const;
export type OwnerTypeEnum = (typeof OWNER_TYPES)[number];

export const CANONICAL_PROPERTY_STATUSES = [
  'Available',
  'Hold',
  'Reserved',
  'Booked',
  'Sold',
  'Blocked',
] as const;
export type CanonicalPropertyStatusEnum = (typeof CANONICAL_PROPERTY_STATUSES)[number];

export const createPropertySchema = z.object({
  projectId: z.string().uuid('Valid project selection is required'),
  blockId: z.string().uuid().optional().or(z.literal('')),
  floorId: z.string().uuid().optional().or(z.literal('')),
  code: z
    .string()
    .trim()
    .min(1, 'Unit code is required')
    .max(64, 'Unit code cannot exceed 64 characters'),
  title: z
    .string()
    .trim()
    .max(255, 'Title cannot exceed 255 characters')
    .optional()
    .or(z.literal('')),
  type: z.enum(['PLOT', 'FLAT', 'SHOP', 'OFFICE', 'PARKING']),
  areaSqft: z
    .string()
    .trim()
    .min(1, 'Area is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Area must be a positive number',
    }),
  facing: z
    .enum([
      'NORTH',
      'SOUTH',
      'EAST',
      'WEST',
      'NORTH_EAST',
      'SOUTH_EAST',
      'NORTH_WEST',
      'SOUTH_WEST',
    ])
    .optional()
    .or(z.literal('')),
  basePricePaisa: z
    .string()
    .trim()
    .min(1, 'Base price is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Base price must be a non-negative number',
    }),
  premiumPaisa: z
    .string()
    .trim()
    .refine((val) => val === '' || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: 'Premium must be a non-negative number',
    })
    .optional()
    .or(z.literal('')),
  discountLimitPct: z
    .string()
    .trim()
    .refine(
      (val) => val === '' || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
      {
        message: 'Discount limit must be between 0 and 100%',
      },
    )
    .optional()
    .or(z.literal('')),
  ownerType: z.enum(['COMPANY', 'LANDOWNER']),
  description: z.string().trim().optional().or(z.literal('')),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

export const statusOverrideSchema = z.object({
  targetStatus: z.enum(['Available', 'Hold', 'Reserved', 'Booked', 'Sold', 'Blocked']),
  reason: z
    .string()
    .trim()
    .min(5, 'Mandatory audit reason must be at least 5 characters long')
    .max(500, 'Reason cannot exceed 500 characters'),
});

export type StatusOverrideInput = z.infer<typeof statusOverrideSchema>;

export const holdPropertySchema = z.object({
  holdExpiresAt: z.string().optional().or(z.literal('')),
  reason: z.string().trim().optional().or(z.literal('')),
});

export type HoldPropertyInput = z.infer<typeof holdPropertySchema>;

export const blockPropertySchema = z.object({
  reason: z.string().trim().min(3, 'Mandatory block reason must be at least 3 characters long'),
});

export type BlockPropertyInput = z.infer<typeof blockPropertySchema>;
