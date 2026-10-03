import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BullMqQueueDriver } from '../../src/adapters/cloud/bullmq-queue-driver.js';
import { ChromiumPdfRenderer } from '../../src/adapters/cloud/chromium-pdf-renderer.js';
import { RedisCacheStore } from '../../src/adapters/cloud/redis-cache-store.js';
import { RedisPubSub } from '../../src/adapters/cloud/redis-pub-sub.js';
import { S3ObjectStorage } from '../../src/adapters/cloud/s3-object-storage.js';
import { SmsStubProvider } from '../../src/adapters/cloud/sms-stub-provider.js';
import { SmtpEmailProvider } from '../../src/adapters/cloud/smtp-email-provider.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';

describe('S2: Cloud Adapters Test Suite (Redis, BullMQ, MinIO, Mailpit)', () => {
  let config: ConfigService;
  let cacheStore: RedisCacheStore;
  let pubSub: RedisPubSub;
  let queueDriver: BullMqQueueDriver;
  let objectStorage: S3ObjectStorage;
  let pdfRenderer: ChromiumPdfRenderer;
  let smsProvider: SmsStubProvider;
  let emailProvider: SmtpEmailProvider;

  beforeAll(async () => {
    const env = validateEnv({
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

    config = new ConfigService(env);

    cacheStore = new RedisCacheStore(config);
    pubSub = new RedisPubSub(config);
    queueDriver = new BullMqQueueDriver(config);
    objectStorage = new S3ObjectStorage(config);
    pdfRenderer = new ChromiumPdfRenderer();
    smsProvider = new SmsStubProvider();
    emailProvider = new SmtpEmailProvider(config);

    await objectStorage.init();
  });

  afterAll(async () => {
    await queueDriver.close();
    await pubSub.close();
    await cacheStore.close();
  });

  describe('RedisCacheStore', () => {
    it('stores, retrieves, increments, and deletes keys in Redis', async () => {
      const key = `test:cache:${Date.now()}`;
      await cacheStore.set(key, { foo: 'bar' }, 60);

      const val = await cacheStore.get<{ foo: string }>(key);
      expect(val).toEqual({ foo: 'bar' });

      const counterKey = `test:counter:${Date.now()}`;
      const c1 = await cacheStore.incr(counterKey);
      const c2 = await cacheStore.incr(counterKey);
      expect(c1).toBe(1);
      expect(c2).toBe(2);

      await cacheStore.del(key);
      const afterDel = await cacheStore.get(key);
      expect(afterDel).toBeNull();
    });
  });

  describe('RedisPubSub', () => {
    it('publishes and receives messages over Redis pub/sub', async () => {
      const channel = `test:channel:${Date.now()}`;
      const expectedMessage = JSON.stringify({ event: 'ping', time: Date.now() });

      let receivedMessage: string | null = null;
      const unsubscribe = await pubSub.subscribe(channel, (msg) => {
        receivedMessage = msg;
      });

      // Small delay for Redis subscribe to register
      await new Promise((resolve) => setTimeout(resolve, 50));

      await pubSub.publish(channel, expectedMessage);

      // Wait for message receipt
      for (let i = 0; i < 20; i++) {
        if (receivedMessage !== null) break;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      expect(receivedMessage).toBe(expectedMessage);
      await unsubscribe();
    });
  });

  describe('BullMqQueueDriver', () => {
    it('enqueues and processes a job with companyId in payload', async () => {
      const queueName = `test-queue-${Date.now()}`;
      const companyId = crypto.randomUUID();
      const testData = { companyId, message: 'Process invoice' };

      let processedPayload: unknown = null;
      const processDonePromise = new Promise<void>((resolve) => {
        void queueDriver.process(queueName, async (job) => {
          processedPayload = job.data;
          resolve();
        });
      });

      const jobId = await queueDriver.enqueue(queueName, testData);
      expect(jobId).toBeDefined();

      await processDonePromise;
      expect(processedPayload).toEqual(testData);
    });
  });

  describe('S3ObjectStorage', () => {
    it('generates presigned PUT and GET URLs against MinIO', async () => {
      const key = `cloud-test-${Date.now()}.pdf`;
      const mimeType = 'application/pdf';
      const content = Buffer.from('%PDF-1.4 Cloud test document');

      const putUrl = await objectStorage.presignPut(key, {
        mimeType,
        sizeBytes: content.length,
      });
      expect(putUrl).toContain(key);

      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: content,
      });
      expect(putRes.ok).toBe(true);

      const head = await objectStorage.head(key);
      expect(head.size).toBe(content.length);

      const getUrl = await objectStorage.presignGet(key);
      const getRes = await fetch(getUrl);
      expect(getRes.ok).toBe(true);

      await objectStorage.delete(key);
    });
  });

  describe('ChromiumPdfRenderer', () => {
    it('renders HTML to a valid PDF buffer', async () => {
      const html = '<h1>ExzaEstate Agreement</h1><p>Customer: John Doe</p>';
      const pdf = await pdfRenderer.render(html);
      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.length).toBeGreaterThan(0);
      expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('SmsStubProvider', () => {
    it('sends an SMS message to a Bangladeshi number', async () => {
      const res = await smsProvider.send({
        to: '+8801712345678',
        body: 'Your ExzaEstate verification code is 123456',
      });
      expect(res.status).toBe('SENT');
      expect(res.messageId).toBeDefined();
    });
  });

  describe('SmtpEmailProvider', () => {
    it('delivers an email to Mailpit SMTP server (1025)', async () => {
      const res = await emailProvider.send({
        to: 'buyer@example.com',
        subject: 'Booking Agreement - ExzaEstate',
        html: '<p>Thank you for your purchase.</p>',
      });
      expect(res.status).toBe('SENT');
      expect(res.messageId).toBeDefined();
    });
  });
});
