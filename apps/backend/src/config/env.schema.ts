import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    RUNTIME_MODE: z.enum(['cloud', 'local']).default('cloud'),

    // Database configuration (PostgreSQL 18 + RLS)
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    MIGRATOR_DATABASE_URL: z.string().min(1).optional(),

    // Redis configuration (BullMQ + Cache; required in cloud mode)
    REDIS_URL: z.string().optional(),

    // Authentication & JWT secrets
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

    // Storage configuration (S3 / MinIO; defaulted for standalone offline use)
    STORAGE_ENDPOINT: z.string().default('http://localhost:9000'),
    STORAGE_REGION: z.string().min(1).default('us-east-1'),
    STORAGE_BUCKET: z.string().default('exzaestate-documents'),
    STORAGE_ACCESS_KEY: z.string().default('minioadmin'),
    STORAGE_SECRET_KEY: z.string().default('minioadmin'),
    STORAGE_FORCE_PATH_STYLE: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          return val === 'true' || val === '1';
        }
        return val === true;
      }, z.boolean())
      .default(true),

    // Local Standalone API security (Task A10.2)
    LOCAL_API_SECRET: z.string().optional(),

    // CORS & Logging
    CORS_ORIGIN: z.string().default('http://localhost:5173,tauri://localhost,http://localhost:1420'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // Client versioning compatibility (D-13)
    MIN_SUPPORTED_CLIENT_VERSION: z.string().default('0.1.0'),

    // Swagger
    SWAGGER_ENABLED: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          return val === 'true' || val === '1';
        }
        if (typeof val === 'boolean') {
          return val;
        }
        return undefined;
      }, z.boolean().optional())
      .optional(),
    SWAGGER_USER: z.string().optional(),
    SWAGGER_PASSWORD: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.RUNTIME_MODE === 'cloud' && (!data.REDIS_URL || data.REDIS_URL.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REDIS_URL'],
        message: 'REDIS_URL is required',
      });
    }
  })
  .transform((data) => {
    // Determine default SWAGGER_ENABLED based on NODE_ENV if not explicitly specified
    const swaggerEnabled =
      data.SWAGGER_ENABLED !== undefined ? data.SWAGGER_ENABLED : data.NODE_ENV !== 'production';

    return {
      ...data,
      REDIS_URL: data.REDIS_URL || 'redis://localhost:6379',
      SWAGGER_ENABLED: swaggerEnabled,
    };
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, unknown> = process.env): EnvConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.');
        if (
          issue.message.includes('expected string, received undefined') ||
          issue.message.includes('received undefined')
        ) {
          return ` - ${path}: ${path} is required`;
        }
        return ` - ${path}: ${issue.message}`;
      })
      .join('\n');
    throw new Error(`Environment configuration validation failed:\n${errorDetails}`);
  }
  return result.data;
}
