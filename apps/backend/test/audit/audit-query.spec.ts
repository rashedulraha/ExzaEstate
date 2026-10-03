import { HttpStatus, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuditTestContext, type AuditTestContext } from './audit-test-helper.js';

describe('Audit Query API & Security-Event Viewer (Task A1.7)', () => {
  let ctx: AuditTestContext;
  let app: INestApplication;

  const targetProjectId = crypto.randomUUID();
  const targetDocumentId = crypto.randomUUID();

  beforeAll(async () => {
    ctx = await createAuditTestContext();
    app = ctx.app;

    // Seed audit logs in Company A across distinct transactions
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      await ctx.auditService.record(tx, {
        module: 'project',
        recordType: 'project',
        recordId: targetProjectId,
        action: 'create',
        newValue: { name: 'Green Valley Project', code: 'PRJ-GV' },
        reason: 'Initial creation',
      });
    });

    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      await ctx.auditService.record(tx, {
        module: 'project',
        recordType: 'project',
        recordId: targetProjectId,
        action: 'update',
        oldValue: { name: 'Green Valley Project' },
        newValue: { name: 'Green Valley Phase 1' },
        reason: 'Project renamed',
      });
    });

    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      await ctx.auditService.record(tx, {
        module: 'documents',
        recordType: 'document',
        recordId: targetDocumentId,
        action: 'create',
        newValue: { title: 'Site Blueprint', version: 1 },
      });
    });

    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      await ctx.auditService.record(tx, {
        module: 'documents',
        recordType: 'document',
        recordId: targetDocumentId,
        action: 'update',
        newValue: { title: 'Site Blueprint v2', version: 2 },
      });
    });

    // Seed security events in Company A
    await ctx.securityEventsService.record({
      companyId: ctx.companyAId,
      userId: ctx.mdAUserId,
      eventType: 'LOGIN_SUCCESS',
      severity: 'INFO',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Agent',
      details: { method: 'password+totp' },
    });

    await ctx.securityEventsService.record({
      companyId: ctx.companyAId,
      userId: ctx.mdAUserId,
      eventType: 'PASSWORD_CHANGED',
      severity: 'WARN',
      ipAddress: '127.0.0.1',
      details: { reason: 'Scheduled rotation' },
    });

    await ctx.securityEventsService.record({
      companyId: ctx.companyAId,
      userId: null,
      eventType: 'LOGIN_FAILED',
      severity: 'ERROR',
      ipAddress: '192.168.1.100',
      details: { email: 'unknown@example.com' },
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('S1: Audit Logs Query & Entity History', () => {
    it('S1.1: Queries audit logs with cursor pagination (newest first)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs?limit=2')
        .set('Authorization', `Bearer ${ctx.mdAToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.hasMore).toBe(true);
      expect(res.body.data.nextCursor).toBeDefined();

      const nextCursor = res.body.data.nextCursor;
      const resPage2 = await request(app.getHttpServer())
        .get(`/api/v1/audit-logs?limit=2&cursor=${nextCursor}`)
        .set('Authorization', `Bearer ${ctx.mdAToken}`)
        .expect(HttpStatus.OK);

      expect(resPage2.body.success).toBe(true);
      expect(resPage2.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(resPage2.body.data.items[0].id).not.toBe(res.body.data.items[0].id);
    });

    it('S1.2: Filters audit logs by module, recordType, and action', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs?module=project&action=create')
        .set('Authorization', `Bearer ${ctx.mdAToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      for (const item of res.body.data.items) {
        expect(item.module).toBe('project');
        expect(item.action).toBe('create');
      }
    });

    it('S1.3: Retrieves complete chronological entity history with before/after state', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/audit-logs/entity/project/${targetProjectId}`)
        .set('Authorization', `Bearer ${ctx.mdAToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.recordType).toBe('project');
      expect(res.body.data.recordId).toBe(targetProjectId);
      expect(res.body.data.history).toHaveLength(2);

      const [first, second] = res.body.data.history;
      expect(first.action).toBe('create');
      expect(first.newValue.name).toBe('Green Valley Project');
      expect(second.action).toBe('update');
      expect(second.oldValue.name).toBe('Green Valley Project');
      expect(second.newValue.name).toBe('Green Valley Phase 1');
    });

    it('S1.4: Requires audit:view and mandatory 2FA enforcement', async () => {
      // Executive role lacks audit:view
      await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${ctx.executiveToken}`)
        .expect(HttpStatus.FORBIDDEN);

      // User holding audit:view but WITHOUT 2FA enabled
      await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${ctx.no2faToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('S2: Security Events & CSV Export', () => {
    it('S2.1: Queries security events with filters and cursor pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/security-events?limit=2')
        .set('Authorization', `Bearer ${ctx.mdAToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.hasMore).toBe(true);
      expect(res.body.data.nextCursor).toBeDefined();

      const filterRes = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/security-events?eventType=LOGIN_FAILED')
        .set('Authorization', `Bearer ${ctx.mdAToken}`)
        .expect(HttpStatus.OK);

      expect(filterRes.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(filterRes.body.data.items[0].eventType).toBe('LOGIN_FAILED');
      expect(filterRes.body.data.items[0].severity).toBe('ERROR');
    });

    it('S2.2: Exports security events as CSV (requires audit:export)', async () => {
      // Executive lacks audit:export
      await request(app.getHttpServer())
        .get('/api/v1/audit-logs/security-events/export')
        .set('Authorization', `Bearer ${ctx.executiveToken}`)
        .expect(HttpStatus.FORBIDDEN);

      // MD with audit:export receives CSV
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/security-events/export')
        .set('Authorization', `Bearer ${ctx.mdAToken}`)
        .expect(HttpStatus.OK);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Timestamp,Event Type,Severity,User ID,IP Address');
      expect(res.text).toContain('LOGIN_SUCCESS');
      expect(res.text).toContain('LOGIN_FAILED');
    });

    it('S2.3: Exports audit logs as CSV (requires audit:export)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/export')
        .set('Authorization', `Bearer ${ctx.mdAToken}`)
        .expect(HttpStatus.OK);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Timestamp,Module,Record Type,Record ID,Action');
      expect(res.text).toContain('Green Valley');
    });

    it('S2.4: Cross-tenant isolation blocks Company B from viewing Company A logs', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/audit-logs/entity/project/${targetProjectId}`)
        .set('Authorization', `Bearer ${ctx.mdBToken}`)
        .expect(HttpStatus.OK);

      // Company B has no access to Company A records -> 0 results
      expect(res.body.data.history).toHaveLength(0);

      const secRes = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/security-events')
        .set('Authorization', `Bearer ${ctx.mdBToken}`)
        .expect(HttpStatus.OK);

      expect(secRes.body.data.items).toHaveLength(0);
    });

    it('S2.5: Confirms audit API is strictly read-only (zero write routes exist)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${ctx.mdAToken}`)
        .expect(HttpStatus.NOT_FOUND);

      await request(app.getHttpServer())
        .delete(`/api/v1/audit-logs/${targetProjectId}`)
        .set('Authorization', `Bearer ${ctx.mdAToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
