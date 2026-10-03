import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    RUNTIME_MODE: z.enum(['cloud', 'local']).default('cloud'),

    // Database configuration (PostgreSQL 18 + RLS)
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    MIGRATOR_DATABASE_URL: z.string().min(1).optional(),

    // Redis configuration (BullMQ + Cache)
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

    // Authentication & JWT secrets
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

    // Storage configuration (S3 / MinIO)
    STORAGE_ENDPOINT: z.string().min(1, 'STORAGE_ENDPOINT is required'),
    STORAGE_REGION: z.string().min(1).default('us-east-1'),
    STORAGE_BUCKET: z.string().min(1, 'STORAGE_BUCKET is required'),
    STORAGE_ACCESS_KEY: z.string().min(1, 'STORAGE_ACCESS_KEY is required'),
    STORAGE_SECRET_KEY: z.string().min(1, 'STORAGE_SECRET_KEY is required'),
    STORAGE_FORCE_PATH_STYLE: z
      .preprocess((val) => {
        if (typeof val === 'string') {
          return val === 'true' || val === '1';
        }
        return val === true;
      }, z.boolean())
      .default(true),

    // CORS & Logging
    CORS_ORIGIN: z.string().default('http://localhost:5173,tauri://localhost'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

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
  .transform((data) => {
    // Determine default SWAGGER_ENABLED based on NODE_ENV if not explicitly specified
    const swaggerEnabled =
      data.SWAGGER_ENABLED !== undefined ? data.SWAGGER_ENABLED : data.NODE_ENV !== 'production';

    return {
      ...data,
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
