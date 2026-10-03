import { HttpStatus, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDocumentTestContext, type DocumentTestContext } from './documents-test-helper.js';

describe('Documents Module S2 & S3: Versions, Permissions & Expiry', () => {
  let ctx: DocumentTestContext;
  let app: INestApplication;
  const sampleProjectId = crypto.randomUUID();
  let createdDocId: string;
  let uploadedFileKey: string;

  beforeAll(async () => {
    ctx = await createDocumentTestContext();
    app = ctx.app;

    // Seed an initial document for versioning tests
    const presignRes = await request(app.getHttpServer())
      .post('/api/v1/documents/presign-upload')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileName: 'project_masterplan.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1048576,
        entityType: 'PROJECT',
        entityId: sampleProjectId,
      })
      .expect(HttpStatus.OK);

    uploadedFileKey = presignRes.body.data.fileKey;

    await fetch(presignRes.body.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: Buffer.from('%PDF-1.4 Initial Version 1'),
    });

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileKey: uploadedFileKey,
        fileName: 'project_masterplan.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1048576,
        title: 'Project Masterplan',
        entityType: 'PROJECT',
        entityId: sampleProjectId,
      })
      .expect(HttpStatus.CREATED);

    createdDocId = createRes.body.data.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('S2.1: Attaches documents polymorphically and queries by entityType and entityId', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/documents?entityType=PROJECT&entityId=${sampleProjectId}`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.data[0].entityType).toBe('PROJECT');
    expect(res.body.data.data[0].entityId).toBe(sampleProjectId);
  });

  it('S2.2: Creates a new version without overwriting previous versions (v1 remains intact)', async () => {
    const presignRes = await request(app.getHttpServer())
      .post('/api/v1/documents/presign-upload')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileName: 'project_masterplan_v2.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2097152,
        entityType: 'PROJECT',
        entityId: sampleProjectId,
      })
      .expect(HttpStatus.OK);

    const v2Key = presignRes.body.data.fileKey;

    await fetch(presignRes.body.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: Buffer.from('%PDF-1.4 Mock Updated Masterplan Version 2'),
    });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/documents/${createdDocId}/versions`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileKey: v2Key,
        fileName: 'project_masterplan_v2.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2097152,
        metadata: { changeSummary: 'Updated zone C road layout' },
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.data.currentVersion).toBe(2);
    expect(res.body.data.versions).toHaveLength(2);
    expect(res.body.data.versions[0].version).toBe(1);
    expect(res.body.data.versions[0].fileKey).toBe(uploadedFileKey);
    expect(res.body.data.versions[1].version).toBe(2);
    expect(res.body.data.versions[1].fileKey).toBe(v2Key);

    const dlV1 = await request(app.getHttpServer())
      .get(`/api/v1/documents/${createdDocId}/download?version=1`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);
    expect(dlV1.body.data.version).toBe(1);

    const dlV2 = await request(app.getHttpServer())
      .get(`/api/v1/documents/${createdDocId}/download?version=2`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);
    expect(dlV2.body.data.version).toBe(2);
  });

  it('S2.3: Restricts sensitive documents with per-document permissions', async () => {
    const presignRes = await request(app.getHttpServer())
      .post('/api/v1/documents/presign-upload')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileName: 'sensitive_tax_clearance.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100000,
        entityType: 'PROJECT',
        entityId: sampleProjectId,
        isPrivate: true,
      })
      .expect(HttpStatus.OK);

    await fetch(presignRes.body.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: Buffer.from('%PDF-1.4 Mock Sensitive Document'),
    });

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileKey: presignRes.body.data.fileKey,
        fileName: 'sensitive_tax_clearance.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100000,
        title: 'Sensitive Tax Clearance',
        entityType: 'PROJECT',
        entityId: sampleProjectId,
        isPrivate: true,
        requiredPermission: 'settings:manage',
      })
      .expect(HttpStatus.CREATED);

    const sensitiveDocId = createRes.body.data.id;

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${sensitiveDocId}`)
      .set('Authorization', `Bearer ${ctx.executiveToken}`)
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${sensitiveDocId}/download`)
      .set('Authorization', `Bearer ${ctx.executiveToken}`)
      .expect(HttpStatus.FORBIDDEN);

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${sensitiveDocId}`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);
  });

  it('S2.4: Cross-tenant isolation blocks other companies from viewing or downloading documents', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/documents/${createdDocId}`)
      .set('Authorization', `Bearer ${ctx.mdBToken}`)
      .expect(HttpStatus.NOT_FOUND);

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${createdDocId}/download`)
      .set('Authorization', `Bearer ${ctx.mdBToken}`)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('S3.1: Document with past expiration date is detected and marked EXPIRED with outbox event', async () => {
    const presignRes = await request(app.getHttpServer())
      .post('/api/v1/documents/presign-upload')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileName: 'trade_license_2025.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10000,
        entityType: 'COMPANY',
        entityId: sampleProjectId,
      })
      .expect(HttpStatus.OK);

    await fetch(presignRes.body.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: Buffer.from('%PDF-1.4 Mock Trade License'),
    });

    const pastExpiryDate = new Date(Date.now() - 3600000).toISOString();
    const docRes = await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileKey: presignRes.body.data.fileKey,
        fileName: 'trade_license_2025.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10000,
        title: 'Trade License 2025 (Expired)',
        entityType: 'COMPANY',
        entityId: sampleProjectId,
        expiresAt: pastExpiryDate,
      })
      .expect(HttpStatus.CREATED);

    expect(docRes.body.data.status).toBe('EXPIRED');
    expect(docRes.body.data.isExpired).toBe(true);

    const expiryScanRes = await request(app.getHttpServer())
      .post('/api/v1/documents/process-expiry')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);

    expect(expiryScanRes.body.success).toBe(true);

    const outboxEvents = await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      return tx.outboxEvent.findMany({
        where: {
          companyId: ctx.companyAId,
          eventName: 'document.expired',
        },
      });
    });

    expect(outboxEvents.length).toBeGreaterThanOrEqual(1);
    const payload = outboxEvents[0]!.payload as { title: string };
    expect(payload.title).toContain('Trade License');
  });
});
