import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdaptersModule } from '../src/adapters/adapters.module.js';
import { configureApp } from '../src/bootstrap.js';
import { ConfigModule } from '../src/config/config.module.js';
import { ConfigService } from '../src/config/config.service.js';
import { validateEnv } from '../src/config/env.schema.js';
import { DatabaseModule } from '../src/database/database.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { HealthModule } from '../src/modules/health/health.module.js';
import { PlatformModule } from '../src/platform/platform.module.js';
import { StorageService } from '../src/platform/storage/storage.service.js';
import type { CacheStore } from '../src/ports/cache-store.port.js';
import { CACHE_STORE } from '../src/ports/tokens.js';

describe('S4: Health & Observability (Tier 1)', () => {
  const validTestEnv = {
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
  };

  const commonImports = [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    DatabaseModule,
    AdaptersModule.forRoot('cloud'),
    PlatformModule,
    HealthModule,
  ];

  describe('When all dependencies are healthy', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const config = validateEnv(validTestEnv);
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(config), ...commonImports],
      }).compile();

      app = moduleFixture.createNestApplication();
      const configService = app.get(ConfigService);
      configureApp(app, configService);
      await app.init();
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('returns 200 with status "ok"', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });
  });

  describe('When Redis is down', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const config = validateEnv(validTestEnv);
      const brokenCacheStore: Partial<CacheStore> = {
        get: async () => {
          throw new Error('Connection refused to redis:6379');
        },
      };

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(config), ...commonImports],
      })
        .overrideProvider(CACHE_STORE)
        .useValue(brokenCacheStore)
        .compile();

      app = moduleFixture.createNestApplication();
      const configService = app.get(ConfigService);
      configureApp(app, configService);
      await app.init();
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('fails with 503 Service Unavailable when Redis is down', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('When Database is down', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const config = validateEnv(validTestEnv);
      const brokenPrisma = {
        $queryRaw: async () => {
          throw new Error('Database connection failed: connect ECONNREFUSED');
        },
      };

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(config), ...commonImports],
      })
        .overrideProvider(PrismaService)
        .useValue(brokenPrisma)
        .compile();

      app = moduleFixture.createNestApplication();
      const configService = app.get(ConfigService);
      configureApp(app, configService);
      await app.init();
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('fails with 503 Service Unavailable when Database is down', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });
  });

  describe('When Storage is down', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const config = validateEnv(validTestEnv);
      const brokenStorage = {
        ensureBucketExists: async () => {
          throw new Error('S3/MinIO service unavailable');
        },
      };

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(config), ...commonImports],
      })
        .overrideProvider(StorageService)
        .useValue(brokenStorage)
        .compile();

      app = moduleFixture.createNestApplication();
      const configService = app.get(ConfigService);
      configureApp(app, configService);
      await app.init();
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('fails with 503 Service Unavailable when Storage is down', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });
  });
});
