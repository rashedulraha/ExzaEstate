import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConfigModule } from '../src/config/config.module.js';
import { validateEnv } from '../src/config/env.schema.js';
import { DatabaseModule } from '../src/database/database.module.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('PrismaService & PostgreSQL 18 Database Connection', () => {
  let moduleRef: TestingModule;
  let prismaService: PrismaService;

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
    });

    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(config), DatabaseModule],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('runs SELECT 1 against the PostgreSQL 18 container successfully', async () => {
    const result = await prismaService.$queryRaw<Array<{ result: number }>>`
      SELECT 1 as result
    `;

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(Number(result[0]?.result)).toBe(1);
  });

  it('confirms connection to PostgreSQL 18.x', async () => {
    const versionResult = await prismaService.$queryRaw<Array<{ version: string }>>`
      SELECT version()
    `;

    expect(versionResult).toBeDefined();
    expect(versionResult.length).toBe(1);
    expect(versionResult[0]?.version).toMatch(/PostgreSQL 18\./);
  });
});
