import { HttpStatus, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDocumentTestContext, type DocumentTestContext } from './documents-test-helper.js';

describe('Documents Module S1: Presigned Upload & Download Flow', () => {
  let ctx: DocumentTestContext;
  let app: INestApplication;
  const sampleProjectId = crypto.randomUUID();
  let createdDocId: string;
  let uploadedFileKey: string;

  beforeAll(async () => {
    ctx = await createDocumentTestContext();
    app = ctx.app;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('S1.1: Generates a presigned upload URL for allowed MIME type (PDF)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/documents/presign-upload')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileName: 'project_masterplan.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1048576,
        entityType: 'PROJECT',
        entityId: sampleProjectId,
        isPrivate: false,
      })
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.uploadUrl).toBeDefined();
    expect(res.body.data.fileKey).toContain(`${ctx.companyAId}/documents/${sampleProjectId}`);
    expect(res.body.data.fileKey).toContain('project_masterplan.pdf');
    expect(res.body.data.expiresInSeconds).toBe(900);

    uploadedFileKey = res.body.data.fileKey;

    const mockContent = Buffer.from('%PDF-1.4 Mock Project Plan PDF');
    const putRes = await fetch(res.body.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: mockContent,
    });
    expect(putRes.ok).toBe(true);
  });

  it('S1.2: Rejects forbidden MIME types with FILE_REJECTED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/documents/presign-upload')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileName: 'malicious_script.sh',
        mimeType: 'application/x-sh',
        sizeBytes: 1024,
        entityType: 'PROJECT',
        entityId: sampleProjectId,
      })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FILE_REJECTED');
  });

  it('S1.3: Rejects files exceeding max allowed size (20MB) with FILE_REJECTED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/documents/presign-upload')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileName: 'massive_video.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 25 * 1024 * 1024,
        entityType: 'PROJECT',
        entityId: sampleProjectId,
      })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FILE_REJECTED');
  });

  it('S1.4: Rejects dangerous executable extensions and malware test files with FILE_REJECTED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/documents/presign-upload')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileName: 'eicar_antivirus_test_file.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 500,
        entityType: 'PROJECT',
        entityId: sampleProjectId,
      })
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FILE_REJECTED');
  });

  it('S1.5: Directs sensitive documents to private storage prefix', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/documents/presign-upload')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileName: 'confidential_nid.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 500000,
        entityType: 'CUSTOMER',
        entityId: sampleProjectId,
        isPrivate: true,
      })
      .expect(HttpStatus.OK);

    expect(res.body.data.fileKey).toContain(
      `${ctx.companyAId}/private/documents/${sampleProjectId}`,
    );
  });

  it('S1.6: Confirms upload and creates document with initial version (v1)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        fileKey: uploadedFileKey,
        fileName: 'project_masterplan.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1048576,
        title: 'Project Masterplan 2026',
        description: 'Initial architectural blueprint',
        entityType: 'PROJECT',
        entityId: sampleProjectId,
        category: 'PLAN',
        isPrivate: false,
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.title).toBe('Project Masterplan 2026');
    expect(res.body.data.currentVersion).toBe(1);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.versions).toHaveLength(1);
    expect(res.body.data.versions[0].version).toBe(1);
    expect(res.body.data.versions[0].fileKey).toBe(uploadedFileKey);

    createdDocId = res.body.data.id;
  });

  it('S1.7: Provides short-lived presigned GET download URL (API never proxies bytes)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/documents/${createdDocId}/download`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.downloadUrl).toBeDefined();
    expect(res.body.data.downloadUrl).toContain('http');
    expect(res.body.data.downloadUrl).toContain(uploadedFileKey);
    expect(res.body.data.version).toBe(1);
    expect(res.body.data.expiresInSeconds).toBe(900);

    const downloadFetch = await fetch(res.body.data.downloadUrl);
    expect(downloadFetch.ok).toBe(true);
    const text = await downloadFetch.text();
    expect(text).toContain('Mock Project Plan PDF');
  });
});
