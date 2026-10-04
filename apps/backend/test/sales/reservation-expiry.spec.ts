import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BOOKING_STATUSES, PAYMENT_STATUSES, PROPERTY_STATUSES } from '@exzaestate/shared';
import { ReservationExpiryService } from '../../src/modules/sales/booking/jobs/reservation-expiry.service.js';
import { type SalesTestContext, setupSalesTestContext } from './sales-test.fixture.js';

describe('A5.5 — Reservation Expiry Job', () => {
  let ctx: SalesTestContext;
  let expiryService: ReservationExpiryService;
  let expiredBookingId: string;
  let unexpiredBookingId: string;
  let confirmedBookingId: string;
  let pendingApprovalBookingId: string;
  let paidBookingId: string;
  let expiredPropertyId: string;

  beforeAll(async () => {
    ctx = await setupSalesTestContext();
    expiryService = ctx.app.get(ReservationExpiryService);

    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const project = await tx.project.create({
        data: {
          companyId: ctx.companyAId,
          code: 'PRJ-EXP-01',
          name: 'Orchid Residency',
          type: 'RESIDENTIAL',
          status: 'UPCOMING',
        },
      });

      const customer = await tx.customer.create({
        data: {
          companyId: ctx.companyAId,
          customerNumber: 'CUST-EXP-001',
          name: 'Kabir Chowdhury',
          phone: '+8801811223344',
          customerType: 'INDIVIDUAL',
        },
      });

      const props = await Promise.all(
        ['101', '102', '103', '104', '105'].map((code, idx) =>
          tx.property.create({
            data: {
              companyId: ctx.companyAId,
              projectId: project.id,
              code: `UNIT-EXP-${code}`,
              title: `Unit ${code}`,
              type: 'APARTMENT',
              status: idx === 2 ? PROPERTY_STATUSES.BOOKED : PROPERTY_STATUSES.RESERVED,
              areaSqft: 1500,
              basePricePaisa: 10_000_000_0n,
              netPricePaisa: 10_000_000_0n,
            },
          }),
        ),
      );

      expiredPropertyId = props[0]!.id;
      const pastExpiry = new Date(Date.now() - 2 * 3600 * 1000);
      const futureExpiry = new Date(Date.now() + 48 * 3600 * 1000);

      const makeBkg = (code: string, propId: string, status: string, expires: Date, paid = 0n) =>
        tx.booking.create({
          data: {
            companyId: ctx.companyAId,
            bookingNumber: code,
            propertyId: propId,
            customerId: customer.id,
            salesExecutiveId: ctx.execUserId,
            status,
            netPricePaisa: 10_000_000_0n,
            bookingAmountPaisa: 1_000_000_0n,
            totalPaidPaisa: paid,
            reservationHoldHours: 72,
            reservationExpiresAt: expires,
          },
        });

      const [bkgExp, bkgUnexp, bkgConf, bkgPend, bkgPaid] = await Promise.all([
        makeBkg('BKG-2026-00091', props[0]!.id, BOOKING_STATUSES.REQUESTED, pastExpiry, 0n),
        makeBkg('BKG-2026-00092', props[1]!.id, BOOKING_STATUSES.REQUESTED, futureExpiry, 0n),
        makeBkg(
          'BKG-2026-00093',
          props[2]!.id,
          BOOKING_STATUSES.CONFIRMED,
          pastExpiry,
          1_000_000_0n,
        ),
        makeBkg('BKG-2026-00094', props[3]!.id, BOOKING_STATUSES.PENDING_APPROVAL, pastExpiry, 0n),
        makeBkg(
          'BKG-2026-00095',
          props[4]!.id,
          BOOKING_STATUSES.REQUESTED,
          pastExpiry,
          1_000_000_0n,
        ),
      ]);

      expiredBookingId = bkgExp.id;
      unexpiredBookingId = bkgUnexp.id;
      confirmedBookingId = bkgConf.id;
      pendingApprovalBookingId = bkgPend.id;
      paidBookingId = bkgPaid.id;

      await tx.payment.create({
        data: {
          companyId: ctx.companyAId,
          paymentNumber: 'PAY-EXP-001',
          bookingId: bkgPaid.id,
          customerId: customer.id,
          amountPaisa: 1_000_000_0n,
          paymentMethod: 'BANK_TRANSFER',
          status: PAYMENT_STATUSES.POSTED,
          postedAt: new Date(),
          createdById: ctx.execUserId,
        },
      });
    });
  });

  afterAll(async () => {
    if (ctx) await ctx.close();
  });

  it('S1 & S2 (AT-11): auto-cancels unfunded REQUESTED booking past hold hours and releases property', async () => {
    const result = await expiryService.processCompanyExpirations(ctx.companyAId);

    expect(result.expiredCount).toBe(1);
    expect(result.cancelledBookingIds).toContain(expiredBookingId);
    expect(result.releasedPropertyIds).toContain(expiredPropertyId);

    const cancelledBooking = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.booking.findUniqueOrThrow({ where: { id: expiredBookingId } }),
    );
    expect(cancelledBooking.status).toBe(BOOKING_STATUSES.CANCELLED);
    expect(cancelledBooking.cancellationReason).toBe('EXPIRED');
    expect(cancelledBooking.cancelledAt).toBeDefined();

    const property = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.property.findUniqueOrThrow({ where: { id: expiredPropertyId } }),
    );
    expect(property.status).toBe(PROPERTY_STATUSES.AVAILABLE);

    const propHistory = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.propertyStatusHistory.findMany({
        where: { propertyId: expiredPropertyId },
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(propHistory[0]?.fromStatus).toBe(PROPERTY_STATUSES.RESERVED);
    expect(propHistory[0]?.toStatus).toBe(PROPERTY_STATUSES.AVAILABLE);
    expect(propHistory[0]?.reason).toContain('EXPIRED');

    const bkgHistory = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.bookingStatusHistory.findMany({
        where: { bookingId: expiredBookingId },
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(bkgHistory[0]?.fromStatus).toBe(BOOKING_STATUSES.REQUESTED);
    expect(bkgHistory[0]?.toStatus).toBe(BOOKING_STATUSES.CANCELLED);
    expect(bkgHistory[0]?.reason).toBe('EXPIRED');

    const auditLogs = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.auditLog.findMany({
        where: { recordId: expiredBookingId, action: 'BOOKING_EXPIRED_CANCELLED' },
      }),
    );
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);

    const notifications = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.inAppNotification.findMany({
        where: { userId: ctx.execUserId },
        orderBy: { createdAt: 'desc' },
      }),
    );
    const expiryNotif = notifications.find((n) => n.eventCode === 'booking.cancelled');
    expect(expiryNotif).toBeDefined();
    expect(expiryNotif?.body).toContain('UNIT-EXP-101');
  });

  it('does NOT cancel non-expired, confirmed, pending approval, or paid bookings', async () => {
    const [unexpired, confirmed, pending, paid] = await ctx.tenantDb.withCompany(
      ctx.companyAId,
      (tx) =>
        Promise.all([
          tx.booking.findUniqueOrThrow({ where: { id: unexpiredBookingId } }),
          tx.booking.findUniqueOrThrow({ where: { id: confirmedBookingId } }),
          tx.booking.findUniqueOrThrow({ where: { id: pendingApprovalBookingId } }),
          tx.booking.findUniqueOrThrow({ where: { id: paidBookingId } }),
        ]),
    );

    expect(unexpired.status).toBe(BOOKING_STATUSES.REQUESTED);
    expect(confirmed.status).toBe(BOOKING_STATUSES.CONFIRMED);
    expect(pending.status).toBe(BOOKING_STATUSES.PENDING_APPROVAL);
    expect(paid.status).toBe(BOOKING_STATUSES.REQUESTED);
  });

  it('S3: ensures idempotent re-run safety (running twice does not double-cancel or re-notify)', async () => {
    const secondResult = await expiryService.processCompanyExpirations(ctx.companyAId);

    expect(secondResult.expiredCount).toBe(0);
    expect(secondResult.cancelledBookingIds.length).toBe(0);
    expect(secondResult.releasedPropertyIds.length).toBe(0);
  });

  it('invokes process-expirations via authorized HTTP controller endpoint', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/sales/bookings/process-expirations')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.data.companyId).toBe(ctx.companyAId);
    expect(typeof res.body.data.expiredCount).toBe('number');
  });

  it('enforces multi-tenant isolation: Company B sweep leaves Company A untouched', async () => {
    const resB = await expiryService.processCompanyExpirations(ctx.companyBId);
    expect(resB.companyId).toBe(ctx.companyBId);
    expect(resB.expiredCount).toBe(0);

    const bkgA = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.booking.findUniqueOrThrow({ where: { id: unexpiredBookingId } }),
    );
    expect(bkgA.status).toBe(BOOKING_STATUSES.REQUESTED);
  });
});
