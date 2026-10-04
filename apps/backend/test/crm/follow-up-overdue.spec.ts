import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CrmTestContext, setupCrmTestContext } from './crm-test.fixture.js';

describe('Follow-up Overdue Calculation & In-App Notifications (Task A3.2 / Steps S2-S3)', () => {
  let ctx: CrmTestContext;
  let overdueFollowUpId: string;
  let upcomingFollowUpId: string;

  beforeAll(async () => {
    ctx = await setupCrmTestContext();

    // 1. Create a lead
    const leadRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Overdue Test Lead',
        phone: '+8801700998877',
        source: 'Phone',
      })
      .expect(HttpStatus.CREATED);

    const leadId = leadRes.body.data.id;

    // 2. Create an OVERDUE follow-up (past date)
    const overdueRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/follow-ups')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        leadId,
        type: 'CALL',
        dueDate: '2026-08-10', // Strictly in the past
        notes: 'Call to follow up on brochure feedback.',
      })
      .expect(HttpStatus.CREATED);
    overdueFollowUpId = overdueRes.body.data.id;

    // 3. Create a FUTURE / UPCOMING follow-up
    const upcomingRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/follow-ups')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        leadId,
        type: 'SITE_VISIT',
        dueDate: '2026-12-25', // Future date
        notes: 'Upcoming site visit during winter holiday.',
      })
      .expect(HttpStatus.CREATED);
    upcomingFollowUpId = upcomingRes.body.data.id;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('marks isOverdue = true for past due follow-up and false for future follow-up in Asia/Dhaka', async () => {
    const overdueRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/follow-ups/${overdueFollowUpId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(HttpStatus.OK);

    expect(overdueRes.body.data.isOverdue).toBe(true);

    const upcomingRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/follow-ups/${upcomingFollowUpId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(HttpStatus.OK);

    expect(upcomingRes.body.data.isOverdue).toBe(false);
  });

  it('filters by overdueOnly = true returning only overdue follow-ups', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/crm/follow-ups?overdueOnly=true')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(HttpStatus.OK);

    const ids = res.body.data.map((f: { id: string }) => f.id);
    expect(ids).toContain(overdueFollowUpId);
    expect(ids).not.toContain(upcomingFollowUpId);
  });

  it('runs overdue processing job, computes overdue items in company timezone, and dispatches in-app notification', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/follow-ups/process-overdue')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.companyId).toBe(ctx.companyAId);
    expect(res.body.data.overdueCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.notifiedCount).toBeGreaterThanOrEqual(1);

    // Verify in-app notification in DB for Exec 1
    const notifications = await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      return tx.inAppNotification.findMany({
        where: {
          companyId: ctx.companyAId,
          userId: ctx.exec1UserId,
          eventCode: 'followup.overdue',
        },
      });
    });

    expect(notifications.length).toBeGreaterThanOrEqual(1);
    const n = notifications[0];
    expect(n?.title).toContain('Follow-Up Overdue');
    expect(n?.body).toContain('Overdue Test Lead');
  });
});
