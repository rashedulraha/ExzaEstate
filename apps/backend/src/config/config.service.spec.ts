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

  it('disables swagger by default in production when not explicitly specified', () => {
    const prodEnv = {
      ...validMockEnv,
      NODE_ENV: 'production',
    };

    const parsed = envSchema.parse(prodEnv);
    expect(parsed.SWAGGER_ENABLED).toBe(false);
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
