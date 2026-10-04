import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { type CrmTestContext, setupCrmTestContext } from './crm-test.fixture.js';

describe('CRM Follow-up CRUD & Lifecycle (Task A3.2 / MOD-FOLLOWUP)', () => {
  let ctx: CrmTestContext;
  let testLeadId: string;
  let createdFollowUpId: string;

  beforeAll(async () => {
    ctx = await setupCrmTestContext();

    // Create a lead under Exec 1
    const leadRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Mr. Asif Mahmud',
        phone: '+8801755667788',
        email: 'asif.mahmud@example.com',
        source: 'Website',
      })
      .expect(HttpStatus.CREATED);

    testLeadId = leadRes.body.data.id;
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('POST /api/v1/crm/follow-ups (Create Follow-up)', () => {
    it('creates a follow-up with valid business date and type', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          leadId: testLeadId,
          type: 'CALL',
          dueDate: '2026-10-20',
          dueTime: '15:30',
          priority: 'HIGH',
          notes: 'Discussion regarding 2500 sqft apartment price and booking schedule.',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.leadId).toBe(testLeadId);
      expect(res.body.data.type).toBe('CALL');
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.priority).toBe('HIGH');
      expect(res.body.data.dueDate).toBe('2026-10-20');
      expect(res.body.data.dueTime).toBe('15:30');
      expect(res.body.data.assignedToId).toBe(ctx.exec1UserId);

      createdFollowUpId = res.body.data.id;
    });

    it('rejects follow-up creation with invalid date format', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          leadId: testLeadId,
          type: 'MEETING',
          dueDate: '20-10-2026', // Invalid format (not YYYY-MM-DD)
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('rejects follow-up creation with unknown interaction type', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          leadId: testLeadId,
          type: 'INVALID_TYPE',
          dueDate: '2026-10-20',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });
  });

  describe('GET /api/v1/crm/follow-ups (List Follow-ups)', () => {
    it('returns paginated list of follow-ups with metadata', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/follow-ups?page=1&limit=10')
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.pageSize).toBe(10);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('filters follow-ups by status and leadId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/follow-ups?leadId=${testLeadId}&status=PENDING`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].leadId).toBe(testLeadId);
      expect(res.body.data[0].status).toBe('PENDING');
    });
  });

  describe('GET /api/v1/crm/follow-ups/:id (Get by ID)', () => {
    it('returns follow-up details by ID', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/follow-ups/${createdFollowUpId}`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdFollowUpId);
      expect(res.body.data.leadName).toBe('Mr. Asif Mahmud');
    });

    it('returns 404 for non-existent follow-up ID', async () => {
      const randomId = '01a104ea-af91-71f9-a2b2-c02981046999';
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/follow-ups/${randomId}`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.NOT_FOUND);
    });
  });

  describe('PATCH /api/v1/crm/follow-ups/:id (Update Follow-up)', () => {
    it('updates follow-up fields successfully', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/crm/follow-ups/${createdFollowUpId}`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          priority: 'URGENT',
          dueDate: '2026-10-22',
          notes: 'Rescheduled upon client request due to overseas travel.',
        })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.priority).toBe('URGENT');
      expect(res.body.data.dueDate).toBe('2026-10-22');
      expect(res.body.data.notes).toContain('Rescheduled upon client request');
    });
  });

  describe('POST /api/v1/crm/follow-ups/:id/complete (Complete Follow-up)', () => {
    it('rejects completion without mandatory outcome', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/crm/follow-ups/${createdFollowUpId}/complete`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('completes follow-up and optionally schedules next follow-up', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/crm/follow-ups/${createdFollowUpId}/complete`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          outcome: 'Client visited office, agreed on 5% down payment. Scheduling site visit.',
          nextFollowUpDate: '2026-10-28',
          nextFollowUpType: 'SITE_VISIT',
          nextFollowUpNotes: 'Physical site visit with civil engineer.',
        })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.outcome).toContain('agreed on 5% down payment');
      expect(res.body.data.completedAt).toBeDefined();
      expect(res.body.data.completedById).toBe(ctx.exec1UserId);

      // Verify that next follow-up was automatically created
      const listRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/follow-ups?leadId=${testLeadId}&status=PENDING`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .expect(HttpStatus.OK);

      const nextF = listRes.body.data.find(
        (f: { type: string; dueDate: string }) =>
          f.type === 'SITE_VISIT' && f.dueDate === '2026-10-28',
      );
      expect(nextF).toBeDefined();
    });

    it('rejects completing an already completed follow-up', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/crm/follow-ups/${createdFollowUpId}/complete`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          outcome: 'Attempting duplicate complete.',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.INVALID_STATE_TRANSITION);
    });
  });

  describe('DELETE /api/v1/crm/follow-ups/:id (Soft delete)', () => {
    it('soft deletes follow-up and excludes it from queries', async () => {
      // First create a follow-up to delete
      const createRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .send({
          leadId: testLeadId,
          type: 'SMS',
          dueDate: '2026-10-30',
        })
        .expect(HttpStatus.CREATED);

      const toDeleteId = createRes.body.data.id;

      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/crm/follow-ups/${toDeleteId}`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .expect(HttpStatus.OK);

      // Now query by ID -> should return 404
      const getRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/follow-ups/${toDeleteId}`)
        .set('Authorization', `Bearer ${ctx.exec1Token}`)
        .expect(HttpStatus.NOT_FOUND);

      expect(getRes.body.error.code).toBe(ERROR_CODES.NOT_FOUND);
    });
  });
});
