import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ACTIVE_BOOKING_STATUSES,
  BOOKING_STATUSES,
  ERROR_CODES,
  PROPERTY_STATUSES,
} from '@exzaestate/shared';
import { type SalesTestContext, setupSalesTestContext } from './sales-test.fixture.js';

describe('A5.3 — Concurrency Guard: Row Lock & Partial Unique Index (Tier 1)', () => {
  let ctx: SalesTestContext;
  let testCustomerIdA: string;
  let testCustomerIdB: string;
  let testPlanTemplateId: string;
  let projectId: string;

  beforeAll(async () => {
    ctx = await setupSalesTestContext();

    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const project = await tx.project.create({
        data: {
          companyId: ctx.companyAId,
          code: 'PRJ-BKG-RACE-01',
          name: 'Booking Race Guard Project',
          type: 'RESIDENTIAL',
          status: 'UPCOMING',
        },
      });
      projectId = project.id;

      const custA = await tx.customer.create({
        data: {
          companyId: ctx.companyAId,
          customerNumber: 'CUST-RACE-001',
          name: 'Buyer Alpha',
          phone: '+8801700000001',
          customerType: 'INDIVIDUAL',
        },
      });
      testCustomerIdA = custA.id;

      const custB = await tx.customer.create({
        data: {
          companyId: ctx.companyAId,
          customerNumber: 'CUST-RACE-002',
          name: 'Buyer Beta',
          phone: '+8801700000002',
          customerType: 'INDIVIDUAL',
        },
      });
      testCustomerIdB = custB.id;

      const template = await tx.paymentPlanTemplate.create({
        data: {
          companyId: ctx.companyAId,
          code: 'PPT-RACE-01',
          name: 'Standard Race Test Plan',
          planType: 'CUSTOM',
          minBookingPct: 10.0,
          downPaymentPct: 10.0,
          frequency: 'MONTHLY',
          installmentCount: 12,
        },
      });
      testPlanTemplateId = template.id;
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  async function createAvailableProperty(code: string): Promise<string> {
    const prop = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.property.create({
        data: {
          companyId: ctx.companyAId,
          projectId,
          code,
          title: `Race Property ${code}`,
          type: 'APARTMENT',
          status: PROPERTY_STATUSES.AVAILABLE,
          areaSqft: 1850,
          basePricePaisa: 12_000_000_0n,
          premiumPaisa: 0n,
          discountLimitPct: 5.0,
          netPricePaisa: 12_000_000_0n,
        },
      }),
    );
    return prop.id;
  }

  describe('AT-01: Sequential Duplicate Booking Rejection', () => {
    it('allows first booking and rejects second with DUPLICATE_BOOKING (409)', async () => {
      const propertyId = await createAvailableProperty('PROP-AT01-01');

      // 1. Customer A books property
      const resA = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId,
          customerId: testCustomerIdA,
          paymentPlanTemplateId: testPlanTemplateId,
          notes: 'Customer A booking',
        });

      expect(resA.status).toBe(HttpStatus.CREATED);
      expect(resA.body.success).toBe(true);
      expect(resA.body.data.status).toBe(BOOKING_STATUSES.REQUESTED);

      // Verify property is now Reserved
      const propAfterA = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.property.findUniqueOrThrow({ where: { id: propertyId } }),
      );
      expect(propAfterA.status).toBe(PROPERTY_STATUSES.RESERVED);

      // 2. Customer B attempts to book the same property
      const resB = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId,
          customerId: testCustomerIdB,
          paymentPlanTemplateId: testPlanTemplateId,
          notes: 'Customer B booking attempt',
        });

      expect(resB.status).toBe(HttpStatus.CONFLICT);
      expect(resB.body.success).toBe(false);
      expect(resB.body.error.code).toBe(ERROR_CODES.DUPLICATE_BOOKING);

      // Verify exactly one booking exists in DB
      const bookingsCount = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.booking.count({ where: { propertyId, deletedAt: null } }),
      );
      expect(bookingsCount).toBe(1);
    });
  });

  describe('AT-02: Simultaneous Concurrent Requests Race Condition', () => {
    it('resolves concurrent booking race: exactly one succeeds (201) and one is rejected (409)', async () => {
      const propertyId = await createAvailableProperty('PROP-AT02-RACE');

      // Dispatch two requests concurrently via Promise.all
      const [res1, res2] = await Promise.all([
        request(ctx.app.getHttpServer())
          .post('/api/v1/sales/bookings')
          .set('Authorization', `Bearer ${ctx.execToken}`)
          .send({
            propertyId,
            customerId: testCustomerIdA,
            paymentPlanTemplateId: testPlanTemplateId,
            notes: 'Concurrent Applicant 1',
          }),
        request(ctx.app.getHttpServer())
          .post('/api/v1/sales/bookings')
          .set('Authorization', `Bearer ${ctx.execToken}`)
          .send({
            propertyId,
            customerId: testCustomerIdB,
            paymentPlanTemplateId: testPlanTemplateId,
            notes: 'Concurrent Applicant 2',
          }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([HttpStatus.CREATED, HttpStatus.CONFLICT]);

      const winner = res1.status === HttpStatus.CREATED ? res1 : res2;
      const loser = res1.status === HttpStatus.CONFLICT ? res1 : res2;

      expect(winner.body.success).toBe(true);
      expect(winner.body.data.status).toBe(BOOKING_STATUSES.REQUESTED);

      expect(loser.body.success).toBe(false);
      expect(loser.body.error.code).toBe(ERROR_CODES.DUPLICATE_BOOKING);

      // Verify exactly 1 active booking exists in the database
      const bookings = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.booking.findMany({ where: { propertyId, deletedAt: null } }),
      );
      expect(bookings.length).toBe(1);
      expect(bookings[0]?.propertyId).toBe(propertyId);
    });

    it('enforces database partial unique index rejection even if application checks are bypassed', async () => {
      const propertyId = await createAvailableProperty('PROP-AT02-DB-INDEX');

      // 1. Insert first active booking directly via database
      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        await tx.booking.create({
          data: {
            companyId: ctx.companyAId,
            bookingNumber: 'BKG-RAW-00001',
            propertyId,
            customerId: testCustomerIdA,
            salesExecutiveId: ctx.execUserId,
            status: BOOKING_STATUSES.REQUESTED,
            basePricePaisa: 12_000_000_0n,
            netPricePaisa: 12_000_000_0n,
            bookingAmountPaisa: 1_200_000_0n,
          },
        });
      });

      // 2. Attempt second active booking insertion directly into DB, bypassing validationService
      let dbError: unknown = null;
      try {
        await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
          await tx.booking.create({
            data: {
              companyId: ctx.companyAId,
              bookingNumber: 'BKG-RAW-00002',
              propertyId,
              customerId: testCustomerIdB,
              salesExecutiveId: ctx.execUserId,
              status: BOOKING_STATUSES.CONFIRMED,
              basePricePaisa: 12_000_000_0n,
              netPricePaisa: 12_000_000_0n,
              bookingAmountPaisa: 1_200_000_0n,
            },
          });
        });
      } catch (err) {
        dbError = err;
      }

      expect(dbError).toBeDefined();
      // Should be rejected by PostgreSQL unique index bookings_active_property_idx
      expect(String(dbError)).toMatch(/bookings_active_property_idx|P2002/);
    });
  });

  describe('AT-03: Idempotency Key Safety', () => {
    it('returns identical booking response when retried with same Idempotency-Key without duplicate creation', async () => {
      const propertyId = await createAvailableProperty('PROP-AT03-IDEMP');
      const idempotencyKey = 'idemp-race-test-' + Date.now();

      // First submission
      const res1 = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          propertyId,
          customerId: testCustomerIdA,
          paymentPlanTemplateId: testPlanTemplateId,
          notes: 'Idempotency test payload',
        });

      expect(res1.status).toBe(HttpStatus.CREATED);
      expect(res1.body.success).toBe(true);
      const bookingNumber1 = res1.body.data.bookingNumber;
      const bookingId1 = res1.body.data.id;

      // Second submission with identical Idempotency-Key
      const res2 = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          propertyId,
          customerId: testCustomerIdA,
          paymentPlanTemplateId: testPlanTemplateId,
          notes: 'Idempotency test payload',
        });

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(res2.status);
      expect(res2.body.success).toBe(true);
      expect(res2.body.data.bookingNumber).toBe(bookingNumber1);
      expect(res2.body.data.id).toBe(bookingId1);

      // Verify DB count is exactly 1
      const count = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.booking.count({ where: { propertyId, deletedAt: null } }),
      );
      expect(count).toBe(1);
    });
  });

  describe('State Machine & Index Alignment', () => {
    it('allows a new booking on the same property after prior booking is CANCELLED', async () => {
      const propertyId = await createAvailableProperty('PROP-CANCEL-REBOOK');

      // 1. Create first booking
      const res1 = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId,
          customerId: testCustomerIdA,
          paymentPlanTemplateId: testPlanTemplateId,
        });

      expect(res1.status).toBe(HttpStatus.CREATED);
      const bookingId1 = res1.body.data.id;

      // 2. Cancel the booking (MD has booking:cancel permission)
      const cancelRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/sales/bookings/${bookingId1}/cancel`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          reason: 'Customer withdrew reservation',
        });

      expect(cancelRes.status).toBe(HttpStatus.OK);
      expect(cancelRes.body.data.status).toBe(BOOKING_STATUSES.CANCELLED);

      // Verify property is Available again
      const propAfterCancel = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.property.findUniqueOrThrow({ where: { id: propertyId } }),
      );
      expect(propAfterCancel.status).toBe(PROPERTY_STATUSES.AVAILABLE);

      // 3. New booking for Customer B should succeed because CANCELLED is not in ACTIVE_BOOKING_STATUSES
      const res2 = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId,
          customerId: testCustomerIdB,
          paymentPlanTemplateId: testPlanTemplateId,
          notes: 'Subsequent booking after cancel',
        });

      expect(res2.status).toBe(HttpStatus.CREATED);
      expect(res2.body.success).toBe(true);
      expect(res2.body.data.id).not.toBe(bookingId1);

      // Total bookings for this property is 2 (1 Cancelled, 1 Requested)
      const totalBookings = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.booking.count({ where: { propertyId } }),
      );
      expect(totalBookings).toBe(2);

      // Active bookings is exactly 1
      const activeBookings = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.booking.count({
          where: {
            propertyId,
            status: { in: [...ACTIVE_BOOKING_STATUSES] },
            deletedAt: null,
          },
        }),
      );
      expect(activeBookings).toBe(1);
    });
  });
});
