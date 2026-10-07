import { describe, expect, it } from 'vitest';
import { ConfigService } from './config.service.js';
import { envSchema, validateEnv } from './env.schema.js';

describe('ConfigService & envSchema', () => {
  const validMockEnv = {
    NODE_ENV: 'test',
    PORT: '3000',
    RUNTIME_MODE: 'cloud',
    DATABASE_URL: 'postgresql://exza_app:secret@localhost:5432/exzaestate',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_key_at_least_32_chars',
    JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_key_at_least_32_chars',
    STORAGE_ENDPOINT: 'http://localhost:9000',
    STORAGE_BUCKET: 'exzaestate-test-bucket',
    STORAGE_ACCESS_KEY: 'minioadmin',
    STORAGE_SECRET_KEY: 'minioadmin',
  };

  it('successfully validates complete environment configuration', () => {
    const config = validateEnv(validMockEnv);
    expect(config.NODE_ENV).toBe('test');
    expect(config.PORT).toBe(3000);
    expect(config.DATABASE_URL).toBe(validMockEnv.DATABASE_URL);
    expect(config.SWAGGER_ENABLED).toBe(true);
    expect(config.MIN_SUPPORTED_CLIENT_VERSION).toBe('0.1.0');

    const service = new ConfigService(config);
    expect(service.minSupportedClientVersion).toBe('0.1.0');
  });

  it('refuses to boot when DATABASE_URL is missing', () => {
    const invalidEnv = { ...validMockEnv };
    delete (invalidEnv as Record<string, unknown>).DATABASE_URL;

    expect(() => validateEnv(invalidEnv)).toThrowError(/DATABASE_URL is required/);
  });

  it('refuses to boot when REDIS_URL is missing', () => {
    const invalidEnv = { ...validMockEnv };
    delete (invalidEnv as Record<string, unknown>).REDIS_URL;

    expect(() => validateEnv(invalidEnv)).toThrowError(/REDIS_URL is required/);
  });

  it('refuses to boot when JWT_ACCESS_SECRET is under 32 characters', () => {
    const invalidEnv = {
      ...validMockEnv,
      JWT_ACCESS_SECRET: 'too_short',
    };

    expect(() => validateEnv(invalidEnv)).toThrowError(
      /JWT_ACCESS_SECRET must be at least 32 characters/,
    );
  });

  const validProdEnv = {
    ...validMockEnv,
    NODE_ENV: 'production',
    STORAGE_ACCESS_KEY: 'prod_cloud_access_key_12345',
    STORAGE_SECRET_KEY: 'prod_cloud_secret_key_67890',
  };

  it('disables swagger by default in production when not explicitly specified', () => {
    const parsed = envSchema.parse(validProdEnv);
    expect(parsed.SWAGGER_ENABLED).toBe(false);
  });

  it('rejects default template JWT secret in production', () => {
    const insecureProd = {
      ...validProdEnv,
      JWT_ACCESS_SECRET: 'change_this_to_a_random_64_character_hex_string_in_production_env',
    };
    expect(() => validateEnv(insecureProd)).toThrowError(
      /Template or placeholder JWT_ACCESS_SECRET cannot be used in production/,
    );
  });

  it('rejects identical JWT access and refresh secrets in production', () => {
    const identicalSecret = 'identical_secret_token_key_at_least_32_chars_long_12345';
    const insecureProd = {
      ...validProdEnv,
      JWT_ACCESS_SECRET: identicalSecret,
      JWT_REFRESH_SECRET: identicalSecret,
    };
    expect(() => validateEnv(insecureProd)).toThrowError(
      /JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production/,
    );
  });

  it('rejects default database passwords in production', () => {
    const insecureProd = {
      ...validProdEnv,
      DATABASE_URL: 'postgresql://exza_app:exza_app_secret@db.prod.internal:5432/exzaestate',
    };
    expect(() => validateEnv(insecureProd)).toThrowError(
      /Default development database password \(exza_app_secret\) is forbidden in production/,
    );
  });

  it('rejects default MinIO credentials in production', () => {
    const insecureProd = {
      ...validProdEnv,
      STORAGE_ACCESS_KEY: 'minioadmin',
    };
    expect(() => validateEnv(insecureProd)).toThrowError(
      /Default MinIO credentials \(minioadmin\) are forbidden in production/,
    );
  });

  it('rejects wildcard CORS origin in production', () => {
    const insecureProd = {
      ...validProdEnv,
      CORS_ORIGIN: '*',
    };
    expect(() => validateEnv(insecureProd)).toThrowError(
      /Wildcard CORS_ORIGIN \(\*\) is strictly forbidden in production/,
    );
  });

  it('requires SWAGGER_USER and secure SWAGGER_PASSWORD when swagger is enabled in production', () => {
    const insecureProdNoAuth = {
      ...validProdEnv,
      SWAGGER_ENABLED: 'true',
    };
    expect(() => validateEnv(insecureProdNoAuth)).toThrowError(
      /Swagger in production requires both SWAGGER_USER and SWAGGER_PASSWORD/,
    );

    const insecureProdDefaultPw = {
      ...validProdEnv,
      SWAGGER_ENABLED: 'true',
      SWAGGER_USER: 'admin',
      SWAGGER_PASSWORD: 'changeme_in_production',
    };
    expect(() => validateEnv(insecureProdDefaultPw)).toThrowError(
      /Default template SWAGGER_PASSWORD is forbidden in production/,
    );
  });

  it('rejects default super admin password in production', () => {
    const insecureProd = {
      ...validProdEnv,
      SUPER_ADMIN_PASSWORD: 'SuperAdmin123!Secure',
    };
    expect(() => validateEnv(insecureProd)).toThrowError(
      /Template or default SUPER_ADMIN_PASSWORD cannot be used in production/,
    );
  });

  it('exposes typed getters on ConfigService', () => {
    const parsed = validateEnv(validMockEnv);
    const service = new ConfigService(parsed);

    expect(service.nodeEnv).toBe('test');
    expect(service.isTest).toBe(true);
    expect(service.isProduction).toBe(false);
    expect(service.port).toBe(3000);
    expect(service.runtimeMode).toBe('cloud');
    expect(service.databaseUrl).toBe(validMockEnv.DATABASE_URL);
    expect(service.jwt.accessSecret).toBe(validMockEnv.JWT_ACCESS_SECRET);
    expect(service.storage.bucket).toBe('exzaestate-test-bucket');
  });
});
