import { z } from 'zod';

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  RUNTIME_MODE: z.enum(['cloud', 'local']).default('cloud'),

  // Database configuration (PostgreSQL 18 + RLS)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  MIGRATOR_DATABASE_URL: z.string().min(1).optional(),
  SYSTEM_DATABASE_URL: z.string().min(1).optional(),

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

  // Super Admin & Initial License Configuration
  SUPER_ADMIN_NAME: z.string().optional(),
  SUPER_ADMIN_EMAIL: z.string().optional(),
  SUPER_ADMIN_SECONDARY_EMAIL: z.string().optional(),
  SUPER_ADMIN_PASSWORD: z.string().optional(),
  INITIAL_LICENSE_KEY: z.string().optional(),
});

function isTemplateJwtSecret(val: string): boolean {
  const lower = val.toLowerCase();
  return (
    lower.includes('change_this') ||
    lower.includes('replace_me') ||
    lower.includes('template') ||
    lower.includes('exza_jwt') ||
    lower.includes('your_secret') ||
    lower.includes('default_secret')
  );
}

type RawEnvData = z.infer<typeof baseEnvSchema>;

function validateProductionJwt(data: RawEnvData, ctx: z.RefinementCtx) {
  if (isTemplateJwtSecret(data.JWT_ACCESS_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_ACCESS_SECRET'],
      message:
        'Template or placeholder JWT_ACCESS_SECRET cannot be used in production. Set a unique cryptographically random secret.',
    });
  }

  if (isTemplateJwtSecret(data.JWT_REFRESH_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_REFRESH_SECRET'],
      message:
        'Template or placeholder JWT_REFRESH_SECRET cannot be used in production. Set a unique cryptographically random secret.',
    });
  }

  if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_REFRESH_SECRET'],
      message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production',
    });
  }
}

function validateProductionDatabases(data: RawEnvData, ctx: z.RefinementCtx) {
  if (data.DATABASE_URL.includes('exza_app_secret')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DATABASE_URL'],
      message: 'Default development database password (exza_app_secret) is forbidden in production',
    });
  }

  if (data.MIGRATOR_DATABASE_URL?.includes('exza_migrator_secret')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MIGRATOR_DATABASE_URL'],
      message:
        'Default migrator database password (exza_migrator_secret) is forbidden in production',
    });
  }

  if (data.SYSTEM_DATABASE_URL?.includes('exza_system_secret')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SYSTEM_DATABASE_URL'],
      message:
        'Default system realm database password (exza_system_secret) is forbidden in production',
    });
  }
}

function validateProductionCredentials(data: RawEnvData, ctx: z.RefinementCtx) {
  if (
    data.STORAGE_ACCESS_KEY.toLowerCase() === 'minioadmin' ||
    data.STORAGE_SECRET_KEY.toLowerCase() === 'minioadmin'
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['STORAGE_ACCESS_KEY'],
      message:
        'Default MinIO credentials (minioadmin) are forbidden in production. Configure secure cloud S3 credentials.',
    });
  }

  if (data.SUPER_ADMIN_PASSWORD) {
    const lower = data.SUPER_ADMIN_PASSWORD.toLowerCase();
    const isWeak =
      data.SUPER_ADMIN_PASSWORD.includes('lDMBXtn9t3nOTa32@2026!') ||
      lower.includes('superadmin123') ||
      lower.includes('changeme') ||
      lower.includes('password');
    if (isWeak) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPER_ADMIN_PASSWORD'],
        message:
          'Template or default SUPER_ADMIN_PASSWORD cannot be used in production. Set a strong unique administrator password.',
      });
    }
  }
}

function validateProductionSwaggerAndCors(data: RawEnvData, ctx: z.RefinementCtx) {
  if (data.SWAGGER_ENABLED === true) {
    if (!data.SWAGGER_USER || !data.SWAGGER_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SWAGGER_ENABLED'],
        message:
          'Swagger in production requires both SWAGGER_USER and SWAGGER_PASSWORD for HTTP Basic Auth',
      });
    }
    if (data.SWAGGER_PASSWORD === 'changeme_in_production') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SWAGGER_PASSWORD'],
        message: 'Default template SWAGGER_PASSWORD is forbidden in production',
      });
    }
  }

  if (data.CORS_ORIGIN.split(',').some((origin) => origin.trim() === '*')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CORS_ORIGIN'],
      message: 'Wildcard CORS_ORIGIN (*) is strictly forbidden in production',
    });
  }
}

export const envSchema = baseEnvSchema
  .superRefine((data, ctx) => {
    // 1. Cloud mode requires REDIS_URL
    if (data.RUNTIME_MODE === 'cloud' && (!data.REDIS_URL || data.REDIS_URL.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REDIS_URL'],
        message: 'REDIS_URL is required in cloud runtime mode',
      });
    }

    // 2. Strict Production Security Hardening (security.md)
    if (data.NODE_ENV === 'production') {
      validateProductionJwt(data, ctx);
      validateProductionDatabases(data, ctx);
      validateProductionCredentials(data, ctx);
      validateProductionSwaggerAndCors(data, ctx);
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
