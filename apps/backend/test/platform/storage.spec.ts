import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { FileRejectedException } from '../../src/platform/storage/storage.exceptions.js';
import { StorageService } from '../../src/platform/storage/storage.service.js';

describe('S5: Storage Service (Tier 1 Integration against MinIO)', () => {
  let moduleRef: TestingModule;
  let storageService: StorageService;

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
      STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
      STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'exzaestate-documents',
      STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
      STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY || 'minioadmin',
      STORAGE_FORCE_PATH_STYLE: 'true',
    });

    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(config)],
      providers: [StorageService],
    }).compile();

    storageService = moduleRef.get<StorageService>(StorageService);
    await storageService.onModuleInit();
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('generates a presigned PUT URL and successfully accepts an uploaded file', async () => {
    const key = `test-docs/agreement-${Date.now()}.pdf`;
    const mimeType = 'application/pdf';
    const content = Buffer.from('%PDF-1.4 Mock PDF Content For Testing ExzaEstate');

    const presignedPutUrl = await storageService.presignPut(key, {
      mimeType,
      sizeBytes: content.length,
    });

    expect(presignedPutUrl).toContain(key);
    expect(presignedPutUrl).toContain('http');

    // Upload directly using standard HTTP fetch to the presigned URL
    const uploadRes = await fetch(presignedPutUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: content,
    });

    expect(uploadRes.ok).toBe(true);

    // Verify object metadata with head()
    const headMeta = await storageService.head(key);
    expect(headMeta.size).toBe(content.length);
    expect(headMeta.contentType).toBe(mimeType);

    // Generate presigned GET URL and fetch content back
    const presignedGetUrl = await storageService.presignGet(key);
    const getRes = await fetch(presignedGetUrl);
    expect(getRes.ok).toBe(true);
    const downloadedBuffer = Buffer.from(await getRes.arrayBuffer());
    expect(downloadedBuffer.equals(content)).toBe(true);

    // Delete object
    await storageService.delete(key);

    // Verifying head throws not found or returns null
    const headAfterDelete = await storageService.head(key).catch(() => null);
    expect(headAfterDelete).toBeNull();
  });

  it('rejects disallowed MIME types with FileRejectedException (HTTP 422 FILE_REJECTED)', async () => {
    const key = 'test-docs/malicious.exe';

    await expect(
      storageService.presignPut(key, {
        mimeType: 'application/x-msdownload',
        sizeBytes: 1024,
      }),
    ).rejects.toThrow(FileRejectedException);
  });

  it('rejects files exceeding maximum size limit with FileRejectedException (HTTP 422 FILE_REJECTED)', async () => {
    const key = 'test-docs/too-large.pdf';
    const oversized = 30 * 1024 * 1024; // 30 MB (max allowed is 20 MB)

    await expect(
      storageService.presignPut(key, {
        mimeType: 'application/pdf',
        sizeBytes: oversized,
      }),
    ).rejects.toThrow(FileRejectedException);
  });
});
