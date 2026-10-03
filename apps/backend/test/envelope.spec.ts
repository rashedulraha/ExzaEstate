import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configureApp } from '../src/bootstrap.js';
import { AppException, ValidationException } from '../src/common/exceptions/app.exception.js';
import { ConfigModule } from '../src/config/config.module.js';
import { ConfigService } from '../src/config/config.service.js';
import { validateEnv } from '../src/config/env.schema.js';
import { HealthModule } from '../src/modules/health/health.module.js';

// Test controller to test various envelope behaviors: BigInt, custom exceptions, unexpected errors
@Controller('test-envelope')
class TestEnvelopeController {
  @Get('bigint')
  getBigInt(): { amount: bigint; nested: { fee: bigint } } {
    return {
      amount: 150000000n,
      nested: { fee: 50000n },
    };
  }

  @Get('validation-error')
  throwValidationError(): void {
    throw new ValidationException('Field "title" is required', {
      field: 'title',
    });
  }

  @Get('custom-error')
  throwCustomError(): void {
    throw new AppException('DUPLICATE_BOOKING', 'Property already has an active booking', {
      propertyId: 'prop-123',
    });
  }

  @Get('unexpected-error')
  throwUnexpectedError(): void {
    throw new Error('Database connection failed unexpectedly');
  }
}

@Module({
  imports: [HealthModule],
  controllers: [TestEnvelopeController],
})
class TestAppModule {}

describe('API Response Envelope, HttpExceptionFilter & Swagger Gating', () => {
  let app: INestApplication;

  const validTestEnv = {
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

  beforeEach(async () => {
    const config = validateEnv(validTestEnv);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(config), TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const configService = app.get(ConfigService);
    configureApp(app, configService);
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/v1/health returns 200 with { success: true, data: { status: "ok" } }', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { status: 'ok' },
    });
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('serializes BigInt values into strings in response data', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/test-envelope/bigint');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        amount: '150000000',
        nested: {
          fee: '50000',
        },
      },
    });
  });

  it('returns 400 with VALIDATION_ERROR code when ValidationException is thrown', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/test-envelope/validation-error');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Field "title" is required');
    expect(res.body.error.details.field).toBe('title');
    expect(res.body.error.details.requestId).toBeDefined();
    expect(res.headers['x-request-id']).toBe(res.body.error.details.requestId);
  });

  it('maps custom AppException (DUPLICATE_BOOKING) to 409 and error code', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/test-envelope/custom-error');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'DUPLICATE_BOOKING',
        message: 'Property already has an active booking',
        details: {
          propertyId: 'prop-123',
          requestId: expect.any(String),
        },
      },
    });
  });

  it('suppresses internal details/stack in production mode for unexpected errors', async () => {
    const prodEnv = validateEnv({
      ...validTestEnv,
      NODE_ENV: 'production',
      SWAGGER_ENABLED: false,
    });

    const prodFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(prodEnv), TestAppModule],
    }).compile();

    const prodApp = prodFixture.createNestApplication();
    const configService = prodApp.get(ConfigService);
    configureApp(prodApp, configService);
    await prodApp.init();

    try {
      const res = await request(prodApp.getHttpServer()).get(
        '/api/v1/test-envelope/unexpected-error',
      );

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(res.body.error.message).toBe('Internal server error');
      expect(res.body.error.details.stack).toBeUndefined();
      expect(res.body.error.details.requestId).toBeDefined();
    } finally {
      await prodApp.close();
    }
  });

  it('disables Swagger at /api/docs in production by default (not reachable anonymously)', async () => {
    const prodEnv = validateEnv({
      ...validTestEnv,
      NODE_ENV: 'production',
      SWAGGER_ENABLED: false,
    });

    const prodFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(prodEnv), TestAppModule],
    }).compile();

    const prodApp = prodFixture.createNestApplication();
    const configService = prodApp.get(ConfigService);
    configureApp(prodApp, configService);
    await prodApp.init();

    try {
      const res = await request(prodApp.getHttpServer()).get('/api/docs');
      // When disabled, route does not exist -> 404
      expect(res.status).toBe(404);
    } finally {
      await prodApp.close();
    }
  });

  it('gates Swagger behind basic auth in production when auth credentials are configured', async () => {
    const prodAuthEnv = validateEnv({
      ...validTestEnv,
      NODE_ENV: 'production',
      SWAGGER_ENABLED: true,
      SWAGGER_USER: 'swagger_admin',
      SWAGGER_PASSWORD: 'swagger_password_123',
    });

    const prodFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(prodAuthEnv), TestAppModule],
    }).compile();

    const prodApp = prodFixture.createNestApplication();
    const configService = prodApp.get(ConfigService);
    configureApp(prodApp, configService);
    await prodApp.init();

    try {
      // Anonymous request should be rejected with 401
      const anonRes = await request(prodApp.getHttpServer()).get('/api/docs');
      expect(anonRes.status).toBe(401);
      expect(anonRes.body.error.code).toBe('UNAUTHORIZED');

      // Request with correct credentials should succeed
      const authRes = await request(prodApp.getHttpServer())
        .get('/api/docs')
        .auth('swagger_admin', 'swagger_password_123');
      // Swagger redirects or returns 200 / 301
      expect([200, 301]).toContain(authRes.status);
    } finally {
      await prodApp.close();
    }
  });
});
