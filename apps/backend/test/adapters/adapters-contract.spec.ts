import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import {
  CACHE_STORE,
  EMAIL_PROVIDER,
  OBJECT_STORAGE,
  PDF_RENDERER,
  PUB_SUB,
  QUEUE_DRIVER,
  SMS_PROVIDER,
  type CacheStore,
  type EmailProvider,
  type ObjectStorage,
  type PdfRenderer,
  type PubSub,
  type QueueDriver,
  type SmsProvider,
} from '../../src/ports/index.js';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '../../src/config/config.module.js';
import { validateEnv } from '../../src/config/env.schema.js';

describe('S3: Shared Adapters Contract Test Suite (Cloud vs Local)', () => {
  const modes: Array<'cloud' | 'local'> = ['cloud', 'local'];

  for (const mode of modes) {
    describe(`Adapter Contract: ${mode.toUpperCase()} Mode`, () => {
      let moduleRef: TestingModule;
      let cacheStore: CacheStore;
      let pubSub: PubSub;
      let queueDriver: QueueDriver;
      let objectStorage: ObjectStorage;
      let pdfRenderer: PdfRenderer;
      let smsProvider: SmsProvider;
      let emailProvider: EmailProvider;

      beforeAll(async () => {
        const env = validateEnv({
          NODE_ENV: 'test',
          PORT: '3000',
          RUNTIME_MODE: mode,
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
          imports: [ConfigModule.forRoot(env), AdaptersModule.forRoot(mode)],
        }).compile();

        cacheStore = moduleRef.get<CacheStore>(CACHE_STORE);
        pubSub = moduleRef.get<PubSub>(PUB_SUB);
        queueDriver = moduleRef.get<QueueDriver>(QUEUE_DRIVER);
        objectStorage = moduleRef.get<ObjectStorage>(OBJECT_STORAGE);
        pdfRenderer = moduleRef.get<PdfRenderer>(PDF_RENDERER);
        smsProvider = moduleRef.get<SmsProvider>(SMS_PROVIDER);
        emailProvider = moduleRef.get<EmailProvider>(EMAIL_PROVIDER);
      });

      afterAll(async () => {
        if (queueDriver) await queueDriver.close();
        if (pubSub) await pubSub.close();
        if (cacheStore) await cacheStore.close();
        if (moduleRef) await moduleRef.close();
      });

      it('satisfies CacheStore contract (set, get, incr, del)', async () => {
        const key = `contract:cache:${mode}:${Date.now()}`;
        await cacheStore.set(key, { value: 42 }, 10);

        const val = await cacheStore.get<{ value: number }>(key);
        expect(val).toEqual({ value: 42 });

        const counterKey = `contract:counter:${mode}:${Date.now()}`;
        const c1 = await cacheStore.incr(counterKey);
        const c2 = await cacheStore.incr(counterKey);
        expect(c1).toBe(1);
        expect(c2).toBe(2);

        await cacheStore.del(key);
        const afterDel = await cacheStore.get(key);
        expect(afterDel).toBeNull();
      });

      it('satisfies PubSub contract (publish, subscribe, unsubscribe)', async () => {
        const channel = `contract:pubsub:${mode}:${Date.now()}`;
        const msg = JSON.stringify({ mode, timestamp: Date.now() });

        let received: string | null = null;
        const unsubscribe = await pubSub.subscribe(channel, (data) => {
          received = data;
        });

        await new Promise((r) => setTimeout(r, 40));
        await pubSub.publish(channel, msg);

        for (let i = 0; i < 20; i++) {
          if (received !== null) break;
          await new Promise((r) => setTimeout(r, 25));
        }

        expect(received).toBe(msg);
        await unsubscribe();
      });

      it('satisfies QueueDriver contract (enqueue and process with companyId)', async () => {
        const queueName = `contract-queue-${mode}-${Date.now()}`;
        const companyId = crypto.randomUUID();
        const testPayload = { companyId, task: 'contract-test' };

        let processed: unknown = null;
        const done = new Promise<void>((resolve) => {
          void queueDriver.process(queueName, async (job) => {
            processed = job.data;
            resolve();
          });
        });

        const jobId = await queueDriver.enqueue(queueName, testPayload);
        expect(jobId).toBeDefined();

        await done;
        expect(processed).toEqual(testPayload);
      });

      it('satisfies ObjectStorage contract (presignPut, presignGet, head, delete)', async () => {
        const key = `contract-${mode}-${Date.now()}.pdf`;
        const mimeType = 'application/pdf';

        const putUrl = await objectStorage.presignPut(key, { mimeType, sizeBytes: 512 });
        expect(putUrl).toContain(key);

        const getUrl = await objectStorage.presignGet(key);
        expect(getUrl).toContain(key);
      });

      it('satisfies PdfRenderer contract (render HTML to PDF buffer)', async () => {
        const html = '<h1>Contract PDF</h1>';
        const buffer = await pdfRenderer.render(html);
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      });

      it('satisfies SmsProvider contract (send SMS to BD mobile)', async () => {
        const res = await smsProvider.send({
          to: '+8801700000000',
          body: `Test SMS in ${mode} mode`,
        });
        expect(res.status).toBe('SENT');
        expect(res.messageId).toBeDefined();
      });

      it('satisfies EmailProvider contract (send email)', async () => {
        const res = await emailProvider.send({
          to: 'tenant@example.com',
          subject: `Contract Test ${mode}`,
          html: `<p>Testing ${mode} email provider.</p>`,
        });
        expect(res.status).toBe('SENT');
        expect(res.messageId).toBeDefined();
      });
    });
  }
});
