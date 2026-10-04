import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { type CrmTestContext, setupCrmTestContext } from './crm-test.fixture.js';

describe('CRM Lead CRUD & Pipeline Lifecycle (Task A3.1 S1-S3)', () => {
  let ctx: CrmTestContext;
  let createdLeadId: string;
  const sharedPhone = '+8801799887766';

  beforeAll(async () => {
    ctx = await setupCrmTestContext();
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.close();
    }
  });

  describe('S1: Lead Capture & Numbering', () => {
    it('creates a new lead with gapless sequence number, status New, and initial history', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          name: 'Engr. Tariqul Islam',
          phone: sharedPhone,
          email: 'tariqul@example.com',
          source: 'Facebook',
          budgetPaisa: '1500000000',
          preferredPropertyType: 'Flat',
          interestNotes: 'Looking for 3BHK south facing flat in Dhanmondi.',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.success).toBe(true);
      const lead = res.body.data;
      expect(lead.id).toBeDefined();
      expect(lead.leadNumber).toMatch(/^LEAD-\d{4}-\d{6}$/);
      expect(lead.name).toBe('Engr. Tariqul Islam');
      expect(lead.phone).toBe(sharedPhone);
      expect(lead.status).toBe('New');
      expect(lead.source).toBe('Facebook');
      expect(lead.assignedToId).toBe(ctx.exec1UserId);

      createdLeadId = lead.id;

      const history = await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        return tx.leadStatusHistory.findMany({
          where: { companyId: ctx.companyAId, leadId: lead.id },
        });
      });
      expect(history.length).toBe(1);
      expect(history[0]?.fromStatus).toBeNull();
      expect(history[0]?.toStatus).toBe('New');
    });

    it('rejects duplicate phone number when allowDuplicate is false (PRD MOD-CRM / FLOW-05)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          name: 'Duplicate Phone Lead',
          phone: sharedPhone,
          source: 'Website',
          allowDuplicate: false,
        })
        .expect(HttpStatus.CONFLICT);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.CONFLICT);
      expect(res.body.error.details.existingLeadId).toBe(createdLeadId);
    });

    it('allows duplicate phone number when allowDuplicate is true (PRD override)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          name: 'Duplicate Override Lead',
          phone: sharedPhone,
          source: 'Website',
          allowDuplicate: true,
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.id).not.toBe(createdLeadId);
    });
  });

  describe('S2: Pipeline State Machine Transitions', () => {
    it('moves lead from New to Contacted', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/crm/leads/${createdLeadId}/status`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          toStatus: 'Contacted',
          reason: 'Initial phone call completed; client interested in brochure.',
        })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Contacted');
    });

    it('rejects invalid state transition (Contacted -> New backward)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/crm/leads/${createdLeadId}/status`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({ toStatus: 'New' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.INVALID_STATE_TRANSITION);
    });

    it('rejects moving to Lost without a mandatory reason (PRD MOD-CRM)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/crm/leads/${createdLeadId}/status`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({ toStatus: 'Lost' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('allows moving to Lost with a mandatory reason', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/crm/leads/${createdLeadId}/status`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          toStatus: 'Lost',
          reason: 'Purchased flat in another project closer to office.',
        })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Lost');
      expect(res.body.data.lostReason).toBe('Purchased flat in another project closer to office.');
    });

    it('allows reopening a Lost lead back to Contacted', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/crm/leads/${createdLeadId}/status`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          toStatus: 'Contacted',
          reason: 'Client called back after reconsidering location.',
        })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Contacted');
    });
  });

  describe('S3: Lead Assignment', () => {
    it('allows assigning a lead to another executive', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/crm/leads/${createdLeadId}/assign`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({ assignedToId: ctx.exec2UserId })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.assignedToId).toBe(ctx.exec2UserId);
    });
  });
});
