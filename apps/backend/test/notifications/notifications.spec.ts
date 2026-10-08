import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DOMAIN_EVENTS } from '@exzaestate/shared';
import { TemplateRenderer } from '../../src/modules/notifications/template-renderer.js';
import {
  createNotificationsTestContext,
  type NotificationsTestContext,
} from './notifications-test-helper.js';

describe('Notification Engine Core (Task A1.8)', () => {
  let ctx: NotificationsTestContext;

  beforeAll(async () => {
    ctx = await createNotificationsTestContext();
  });

  afterAll(async () => {
    await ctx.outboxDispatcher.close();
    await ctx.app.close();
  });

  describe('S1: Notification Event Catalogue & Template Rendering', () => {
    it('S1.1: TemplateRenderer interpolates variables and handles missing keys', () => {
      const template = 'Hello {{user.name}}, your booking {{bookingNo}} is {{status}}!';
      const context = {
        user: { name: 'Rahim' },
        bookingNo: 'B-101',
        status: 'confirmed',
      };
      const rendered = TemplateRenderer.render(template, context);
      expect(rendered).toBe('Hello Rahim, your booking B-101 is confirmed!');

      const missingRendered = TemplateRenderer.render('Missing: {{nonexistent}}', {});
      expect(missingRendered).toBe('Missing: ');
    });

    it('S1.2: Global notification event catalog exists and is populated with domain events', async () => {
      const catalog = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.notificationEventCatalog.findMany(),
      );

      expect(catalog.length).toBeGreaterThanOrEqual(10);
      const codes = catalog.map((c) => c.code);
      expect(codes).toContain('booking.confirmed');
      expect(codes).toContain('installment.due');
      expect(codes).toContain('approval.requested');
    });

    it('S1.3: Tenant default templates are seeded during provisioning', async () => {
      const templates = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.notificationTemplate.findMany({ where: { companyId: ctx.companyAId } }),
      );

      expect(templates.length).toBeGreaterThanOrEqual(10);
      const confirmedTpl = templates.find((t) => t.eventCode === 'booking.confirmed');
      expect(confirmedTpl).toBeDefined();
      expect(confirmedTpl?.channel).toBe('IN_APP');
      expect(confirmedTpl?.title).toContain('Booking Confirmed');
    });
  });

  describe('S2: NotificationService.notify & In-App Inbox Endpoints', () => {
    let createdNotificationId: string;

    it('S2.1: notify(tx, ...) generates in-app notifications and writes to partitioned notification_logs', async () => {
      const result = await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        return ctx.notificationService.notify(
          tx,
          DOMAIN_EVENTS.BOOKING_CONFIRMED,
          [ctx.user1AId, ctx.user2AId],
          {
            bookingNo: 'BK-2026-0001',
            propertyCode: 'FLAT-5A',
            companyId: ctx.companyAId,
          },
        );
      });

      expect(result.deliveredCount).toBe(2);
      expect(result.skippedCount).toBe(0);

      // Verify in_app_notifications records
      const notifs = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.inAppNotification.findMany({
          where: { companyId: ctx.companyAId, eventCode: DOMAIN_EVENTS.BOOKING_CONFIRMED },
        }),
      );
      expect(notifs.length).toBe(2);
      expect(notifs[0]?.title).toContain('Booking Confirmed: BK-2026-0001');
      expect(notifs[0]?.body).toContain('FLAT-5A');

      // Verify partitioned notification_logs records
      const logs = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.notificationLog.findMany({
          where: { companyId: ctx.companyAId, channel: 'IN_APP' },
        }),
      );
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs[0]?.status).toBe('SENT');
    });

    it('S2.2: User notification preferences suppress notifications when disabled', async () => {
      // Disable booking.confirmed for user2A
      await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.notificationPreference.upsert({
          where: {
            companyId_userId_eventCode_channel: {
              companyId: ctx.companyAId,
              userId: ctx.user2AId,
              eventCode: DOMAIN_EVENTS.BOOKING_CONFIRMED,
              channel: 'IN_APP',
            },
          },
          update: { enabled: false },
          create: {
            companyId: ctx.companyAId,
            userId: ctx.user2AId,
            eventCode: DOMAIN_EVENTS.BOOKING_CONFIRMED,
            channel: 'IN_APP',
            enabled: false,
          },
        }),
      );

      const result = await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        return ctx.notificationService.notify(
          tx,
          DOMAIN_EVENTS.BOOKING_CONFIRMED,
          [ctx.user1AId, ctx.user2AId],
          {
            bookingNo: 'BK-2026-0002',
            propertyCode: 'FLAT-5B',
            companyId: ctx.companyAId,
          },
        );
      });

      expect(result.deliveredCount).toBe(1);
      expect(result.skippedCount).toBe(1);
    });

    it('S2.3: GET /api/v1/notifications lists inbox with pagination and isRead filter', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications?limit=10')
        .set('Authorization', `Bearer ${ctx.user1AToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);

      const firstItem = res.body.data.items[0];
      createdNotificationId = firstItem.id;
      expect(firstItem.isRead).toBe(false);
      expect(firstItem.userId).toBe(ctx.user1AId);

      // Test filtering by isRead=true (should be empty initially)
      const readRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications?isRead=true')
        .set('Authorization', `Bearer ${ctx.user1AToken}`)
        .expect(200);

      expect(readRes.body.data.items.length).toBe(0);
    });

    it('S2.4: GET /api/v1/notifications/unread-count returns accurate count', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${ctx.user1AToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.count).toBe('number');
      expect(res.body.data.count).toBeGreaterThanOrEqual(2);
    });

    it('S2.5: PATCH /api/v1/notifications/:id/read marks single notification read', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/notifications/${createdNotificationId}/read`)
        .set('Authorization', `Bearer ${ctx.user1AToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdNotificationId);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).toBeDefined();

      // Verify unread count decremented
      const countRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${ctx.user1AToken}`)
        .expect(200);

      expect(countRes.body.data.count).toBe(1);
    });

    it('S2.6: POST /api/v1/notifications/mark-all-read marks all user notifications read', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/mark-all-read')
        .set('Authorization', `Bearer ${ctx.user1AToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedCount).toBeGreaterThanOrEqual(1);

      const countRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${ctx.user1AToken}`)
        .expect(200);

      expect(countRes.body.data.count).toBe(0);
    });

    it('S2.7: GET & PUT /api/v1/notifications/preferences manages user preferences', async () => {
      const getRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${ctx.user1AToken}`)
        .expect(200);

      expect(getRes.body.success).toBe(true);
      expect(Array.isArray(getRes.body.data)).toBe(true);

      const putRes = await request(ctx.app.getHttpServer())
        .put('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${ctx.user1AToken}`)
        .send({
          preferences: [
            {
              eventCode: 'installment.due',
              channel: 'IN_APP',
              enabled: false,
            },
          ],
        })
        .expect(200);

      expect(putRes.body.success).toBe(true);
      const installmentPref = putRes.body.data.find(
        (p: { eventCode: string }) => p.eventCode === 'installment.due',
      );
      expect(installmentPref?.enabled).toBe(false);
    });

    it('S2.8: Requires notification:view permission', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${ctx.noPermToken}`)
        .expect(403);
    });
  });

  describe('S3: Outbox Listener Rendering Templates', () => {
    it('S3.1: Dispatched outbox event renders templates into in-app notifications for designated recipients', async () => {
      // Emit an outbox event
      const eventId = await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        return ctx.outboxService.emit(tx, DOMAIN_EVENTS.APPROVAL_REQUESTED, {
          action: 'DISCOUNT_APPROVAL',
          entityType: 'Booking',
          entityId: 'B-999',
          requesterName: 'Sales Rep 1',
          recipients: [ctx.user1AId],
          companyId: ctx.companyAId,
        });
      });

      expect(eventId).toBeDefined();

      // Dispatch pending batches until our outbox event is processed
      let notifs: Array<{ title: string; body: string }> = [];
      for (let attempt = 0; attempt < 10; attempt++) {
        await ctx.outboxDispatcher.dispatchBatch(50);
        notifs = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
          tx.inAppNotification.findMany({
            where: {
              companyId: ctx.companyAId,
              userId: ctx.user1AId,
              eventCode: DOMAIN_EVENTS.APPROVAL_REQUESTED,
            },
          }),
        );
        if (notifs.length >= 1) break;
      }

      expect(notifs.length).toBe(1);
      expect(notifs[0]?.title).toContain('Approval Required: DISCOUNT_APPROVAL');
      expect(notifs[0]?.body).toContain('Booking B-999');
    });
  });

  describe('Multi-Tenant & User Isolation', () => {
    it('Isolates in-app notifications between users and companies', async () => {
      // User B of Company B queries inbox
      const resB = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${ctx.userBToken}`)
        .expect(200);

      // Company B has 0 notifications
      expect(resB.body.data.items.length).toBe(0);

      // User 2 of Company A queries inbox
      const res2A = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${ctx.user2AToken}`)
        .expect(200);

      // User 2 cannot see User 1's notifications
      for (const item of res2A.body.data.items) {
        expect(item.userId).toBe(ctx.user2AId);
        expect(item.companyId).toBe(ctx.companyAId);
      }
    });
  });
});
