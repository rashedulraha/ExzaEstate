import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { type CrmTestContext, setupCrmTestContext } from './crm-test.fixture.js';

describe('Follow-up RBAC Data Scopes & Tenant Isolation (AT-16 / MOD-FOLLOWUP)', () => {
  let ctx: CrmTestContext;
  let exec1LeadId: string;
  let exec2LeadId: string;
  let exec1FollowUpId: string;
  let exec2FollowUpId: string;

  beforeAll(async () => {
    ctx = await setupCrmTestContext();

    // 1. Exec 1 creates a lead and follow-up
    const l1 = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Executive 1 Lead',
        phone: '+8801700112233',
        source: 'Facebook',
      })
      .expect(HttpStatus.CREATED);
    exec1LeadId = l1.body.data.id;

    const f1 = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/follow-ups')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        leadId: exec1LeadId,
        type: 'CALL',
        dueDate: '2026-10-15',
        notes: 'Follow up by Exec 1',
      })
      .expect(HttpStatus.CREATED);
    exec1FollowUpId = f1.body.data.id;

    // 2. Exec 2 creates a lead and follow-up
    const l2 = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${ctx.exec2Token}`)
      .send({
        name: 'Executive 2 Lead',
        phone: '+8801800112244',
        source: 'Google',
      })
      .expect(HttpStatus.CREATED);
    exec2LeadId = l2.body.data.id;

    const f2 = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/follow-ups')
      .set('Authorization', `Bearer ${ctx.exec2Token}`)
      .send({
        leadId: exec2LeadId,
        type: 'SITE_VISIT',
        dueDate: '2026-10-18',
        notes: 'Follow up by Exec 2',
      })
      .expect(HttpStatus.CREATED);
    exec2FollowUpId = f2.body.data.id;
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('AT-16 Scope Rule: Executive A under OWN scope cannot access Executive B follow-up', () => {
    it('Exec 1 list only returns their own follow-ups, not Exec 2 follow-ups', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .expect(HttpStatus.OK);

      const ids = res.body.data.map((f: { id: string }) => f.id);
      expect(ids).toContain(exec1FollowUpId);
      expect(ids).not.toContain(exec2FollowUpId);
    });

    it('Exec 2 list only returns their own follow-ups, not Exec 1 follow-ups', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.exec2Token}`)
        .expect(HttpStatus.OK);

      const ids = res.body.data.map((f: { id: string }) => f.id);
      expect(ids).toContain(exec2FollowUpId);
      expect(ids).not.toContain(exec1FollowUpId);
    });

    it('Exec 1 cannot get Exec 2 follow-up directly by ID (HTTP 403 FORBIDDEN)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/follow-ups/${exec2FollowUpId}`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    });

    it('Exec 2 cannot update Exec 1 follow-up (HTTP 403 FORBIDDEN)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/crm/follow-ups/${exec1FollowUpId}`)
        .set('Authorization', `Bearer ${ctx.exec2Token}`)
        .send({ notes: 'Unauthorized modification' })
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    });

    it('Exec 2 cannot complete Exec 1 follow-up (HTTP 403 FORBIDDEN)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/crm/follow-ups/${exec1FollowUpId}/complete`)
        .set('Authorization', `Bearer ${ctx.exec2Token}`)
        .send({ outcome: 'Unauthorized complete' })
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    });
  });

  describe('General Manager under ALL scope sees all follow-ups', () => {
    it('GM lists both Exec 1 and Exec 2 follow-ups', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .expect(HttpStatus.OK);

      const ids = res.body.data.map((f: { id: string }) => f.id);
      expect(ids).toContain(exec1FollowUpId);
      expect(ids).toContain(exec2FollowUpId);
    });

    it('GM can view both Exec 1 and Exec 2 follow-ups directly', async () => {
      const res1 = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/follow-ups/${exec1FollowUpId}`)
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .expect(HttpStatus.OK);

      expect(res1.body.data.id).toBe(exec1FollowUpId);

      const res2 = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/follow-ups/${exec2FollowUpId}`)
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .expect(HttpStatus.OK);

      expect(res2.body.data.id).toBe(exec2FollowUpId);
    });
  });

  describe('PostgreSQL Row-Level Security (RLS) Cross-Tenant Isolation', () => {
    it('Company B user cannot view Company A follow-up (HTTP 404 NOT_FOUND)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/follow-ups/${exec1FollowUpId}`)
        .set('Authorization', `Bearer ${ctx.companyBToken}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.NOT_FOUND);
    });
  });
});
