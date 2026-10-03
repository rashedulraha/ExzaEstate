import type { INestApplication } from '@nestjs/common';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ClsModule } from 'nestjs-cls';
import { PERMISSIONS } from '@exzaestate/shared';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { RequirePermission } from '../../src/common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../src/common/guards/permissions.guard.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { hashPassword } from '../../src/modules/auth/utils/password.util.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { SecurityEventsService } from '../../src/platform/security/security-events.service.js';

@Controller('test-security-events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class TestSecurityEventsController {
  @RequirePermission(PERMISSIONS.PERIOD_CLOSE)
  @Get('protected-action')
  executeProtected() {
    return { ok: true };
  }
}

describe('S3: Security Events & Immutability (Tier 1)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let tenantDb: TenantDb;
  let securityEventsService: SecurityEventsService;
  let tokenService: TokenService;

  const testCompanyId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const testEmail = `sec-events-${Date.now()}@example.com`;
  let userToken = '';

  beforeAll(async () => {
    const config = validateEnv({
      NODE_ENV: 'test',
      PORT: '3000',
      RUNTIME_MODE: 'cloud',
      DATABASE_URL:
        process.env.DATABASE_URL ||
        'postgresql://exza_app:exza_app_secret@localhost:5432/exzaestate?schema=public',
      MIGRATOR_DATABASE_URL:
        process.env.MIGRATOR_DATABASE_URL ||
        'postgresql://exza_migrator:exza_migrator_secret@localhost:5432/exzaestate?schema=public',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_key_at_least_32_chars',
      JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_key_at_least_32_chars',
      STORAGE_ENDPOINT: 'http://localhost:9000',
      STORAGE_BUCKET: 'exzaestate-documents',
      STORAGE_ACCESS_KEY: 'minioadmin',
      STORAGE_SECRET_KEY: 'minioadmin',
      CORS_ORIGIN: 'http://localhost:5173,tauri://localhost',
    });

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(config),
        ClsModule.forRoot({
          global: true,
          middleware: { mount: true },
        }),
        DatabaseModule,
        AdaptersModule.forRoot('cloud'),
        PlatformModule,
        AuthModule,
      ],
      controllers: [TestSecurityEventsController],
    }).compile();

    const configService = moduleRef.get<ConfigService>(ConfigService);
    app = moduleRef.createNestApplication();
    configureApp(app, configService);
    await app.init();

    tenantDb = moduleRef.get<TenantDb>(TenantDb);
    securityEventsService = moduleRef.get<SecurityEventsService>(SecurityEventsService);
    tokenService = moduleRef.get<TokenService>(TokenService);

    // Seed test company and user without permissions
    await tenantDb.withCompany(testCompanyId, async (tx) => {
      await tx.company.create({
        data: {
          id: testCompanyId,
          companyId: testCompanyId,
          name: 'Security Events Company',
          code: `SEC_${Date.now()}`,
        },
      });

      const passwordHash = await hashPassword('SecurePass123!');
      await tx.user.create({
        data: {
          id: testUserId,
          companyId: testCompanyId,
          email: testEmail,
          passwordHash,
          fullName: 'Security Event User',
          status: 'ACTIVE',
        },
      });

      const session = await tokenService.createSessionAndTokens(tx, {
        userId: testUserId,
        companyId: testCompanyId,
      });
      userToken = session.accessToken;
    });
  });

  afterAll(async () => {
    try {
      await tenantDb.withCompany(testCompanyId, async (tx) => {
        await tx.user.deleteMany({ where: { companyId: testCompanyId } });
        await tx.company.delete({ where: { id: testCompanyId } });
      });
    } catch {
      // ignore
    }
    await app.close();
  });

  it('records a security event and verifies it is inserted in security_events table', async () => {
    const event = await securityEventsService.record({
      companyId: testCompanyId,
      userId: testUserId,
      eventType: 'LOGIN_SUCCESS',
      severity: 'INFO',
      details: { client: 'desktop' },
      ipAddress: '127.0.0.1',
    });

    expect(event.id).toBeDefined();

    const rows = await tenantDb.withCompany(testCompanyId, async (tx) => {
      return tx.$queryRawUnsafe<Array<{ id: string; event_type: string }>>(
        `SELECT id, event_type FROM security_events WHERE id = $1::uuid`,
        event.id,
      );
    });

    expect(rows.length).toBe(1);
    expect(rows[0]?.event_type).toBe('LOGIN_SUCCESS');
  });

  it('enforces immutability: updating or deleting a security_events row fails', async () => {
    const event = await securityEventsService.record({
      companyId: testCompanyId,
      userId: testUserId,
      eventType: 'LOCKOUT',
      severity: 'WARN',
      ipAddress: '127.0.0.1',
    });

    // Attempt UPDATE: must throw database error from trigger
    await expect(
      tenantDb.withCompany(testCompanyId, async (tx) => {
        await tx.$executeRawUnsafe(
          `UPDATE security_events SET severity = 'INFO' WHERE id = $1::uuid`,
          event.id,
        );
      }),
    ).rejects.toThrow();

    // Attempt DELETE: must throw database error from trigger
    await expect(
      tenantDb.withCompany(testCompanyId, async (tx) => {
        await tx.$executeRawUnsafe(`DELETE FROM security_events WHERE id = $1::uuid`, event.id);
      }),
    ).rejects.toThrow();
  });

  it('records a FORBIDDEN security event when unauthorized request is rejected (403)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/test-security-events/protected-action')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);

    // Verify FORBIDDEN event was persisted in security_events
    const forbiddenEvents = await tenantDb.withCompany(testCompanyId, async (tx) => {
      return tx.$queryRawUnsafe<Array<{ event_type: string; user_id: string }>>(
        `SELECT event_type, user_id FROM security_events WHERE company_id = $1::uuid AND event_type = 'FORBIDDEN'`,
        testCompanyId,
      );
    });

    expect(forbiddenEvents.length).toBeGreaterThanOrEqual(1);
    expect(forbiddenEvents[0]?.user_id).toBe(testUserId);
  });
});
