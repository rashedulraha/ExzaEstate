import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { type CrmTestContext, setupCrmTestContext } from './crm-test.fixture.js';

describe('AT-16 Data Scope & Multi-Tenant Isolation (Task A3.1 S4-S5)', () => {
  let ctx: CrmTestContext;
  let leadA1Id: string;
  let leadA2Id: string;

  beforeAll(async () => {
    ctx = await setupCrmTestContext();

    // 1. Exec 1 creates Lead 1 (assigned to Exec 1)
    const res1 = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Executive 1 Exclusive Client',
        phone: '+8801711223344',
        source: 'Facebook',
        assignedToId: ctx.exec1UserId,
      })
      .expect(HttpStatus.CREATED);
    leadA1Id = res1.body.data.id;

    // 2. Exec 2 creates Lead 2 (assigned to Exec 2)
    const res2 = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${ctx.exec2Token}`)
      .send({
        name: 'Executive 2 Exclusive Client',
        phone: '+8801833445566',
        source: 'Referral',
        assignedToId: ctx.exec2UserId,
      })
      .expect(HttpStatus.CREATED);
    leadA2Id = res2.body.data.id;
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.close();
    }
  });

  describe('S4: AT-16 Data Scope Acceptance Test', () => {
    it('Executive 1 under OWN scope only lists their own leads, not Executive 2 leads', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      const leadIds = res.body.data.items.map((l: { id: string }) => l.id);
      expect(leadIds).toContain(leadA1Id);
      expect(leadIds).not.toContain(leadA2Id);
    });

    it('Executive 1 under OWN scope receives 403 Forbidden when opening Executive 2 lead directly', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/leads/${leadA2Id}`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    });

    it('Executive 2 under OWN scope only lists their own leads, not Executive 1 leads', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${ctx.exec2Token}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      const leadIds = res.body.data.items.map((l: { id: string }) => l.id);
      expect(leadIds).toContain(leadA2Id);
      expect(leadIds).not.toContain(leadA1Id);
    });

    it('Executive 2 under OWN scope receives 403 Forbidden when opening Executive 1 lead directly', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/leads/${leadA1Id}`)
        .set('Authorization', `Bearer ${ctx.exec2Token}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    });

    it('General Manager under ALL scope lists BOTH Executive 1 and Executive 2 leads', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      const leadIds = res.body.data.items.map((l: { id: string }) => l.id);
      expect(leadIds).toContain(leadA1Id);
      expect(leadIds).toContain(leadA2Id);
    });

    it('General Manager under ALL scope can fetch both leads directly', async () => {
      const res1 = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/leads/${leadA1Id}`)
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .expect(HttpStatus.OK);
      expect(res1.body.success).toBe(true);

      const res2 = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/leads/${leadA2Id}`)
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .expect(HttpStatus.OK);
      expect(res2.body.success).toBe(true);
    });
  });

  describe('S5: Cross-Tenant Isolation (RLS & Scoping)', () => {
    it('prevents Company B user from listing Company A leads', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${ctx.companyBToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      const leadIds = res.body.data.items.map((l: { id: string }) => l.id);
      expect(leadIds).not.toContain(leadA1Id);
      expect(leadIds).not.toContain(leadA2Id);
    });

    it('prevents Company B user from opening Company A lead directly', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/leads/${leadA1Id}`)
        .set('Authorization', `Bearer ${ctx.companyBToken}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.NOT_FOUND);
    });
  });
});
