import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BOOKING_STATUSES, ERROR_CODES, PROPERTY_STATUSES } from '@exzaestate/shared';
import { type SalesTestContext, setupSalesTestContext } from './sales-test.fixture.js';

describe('A5.1 — Booking Lifecycle & State Transitions', () => {
  let ctx: SalesTestContext;
  let testPropertyId: string;
  let testCustomerId: string;
  let testPlanTemplateId: string;

  beforeAll(async () => {
    ctx = await setupSalesTestContext();

    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const project = await tx.project.create({
        data: {
          companyId: ctx.companyAId,
          code: 'PRJ-BKG-LC-01',
          name: 'Booking Lifecycle Project',
          type: 'RESIDENTIAL',
          status: 'UPCOMING',
        },
      });

      const property = await tx.property.create({
        data: {
          companyId: ctx.companyAId,
          projectId: project.id,
          code: 'PLOT-BKG-LC-01',
          title: 'Lifecycle Test Plot',
          type: 'PLOT',
          status: PROPERTY_STATUSES.AVAILABLE,
          areaSqft: 2400,
          basePricePaisa: 10_000_000_0n,
          premiumPaisa: 500_000_0n,
          discountLimitPct: 5.0,
          netPricePaisa: 10_500_000_0n,
        },
      });
      testPropertyId = property.id;

      const customer = await tx.customer.create({
        data: {
          companyId: ctx.companyAId,
          customerNumber: 'CUST-BKG-LC-001',
          name: 'Ahmed Hasan',
          phone: '+8801712345678',
          customerType: 'INDIVIDUAL',
        },
      });
      testCustomerId = customer.id;

      const template = await tx.paymentPlanTemplate.create({
        data: {
          companyId: ctx.companyAId,
          code: 'PPT-BKG-LC-01',
          name: 'Standard 12 Month Plan',
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

  describe('S1 & S2: Creation & Validation Pipeline', () => {
    it('creates a new booking in REQUESTED state and sets property to Reserved', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId: testPropertyId,
          customerId: testCustomerId,
          paymentPlanTemplateId: testPlanTemplateId,
          notes: 'Customer visited Banani sales lounge',
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(BOOKING_STATUSES.REQUESTED);
      expect(res.body.data.bookingNumber).toMatch(/^BKG-\d{4}-\d{5}$/);
      expect(res.body.data.propertyId).toBe(testPropertyId);
      expect(res.body.data.customerId).toBe(testCustomerId);

      const property = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.property.findUniqueOrThrow({ where: { id: testPropertyId } }),
      );
      expect(property.status).toBe(PROPERTY_STATUSES.RESERVED);
    });

    it('rejects a second booking request on the same property with DUPLICATE_BOOKING (409)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId: testPropertyId,
          customerId: testCustomerId,
          paymentPlanTemplateId: testPlanTemplateId,
        });

      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(res.body.error.code).toBe(ERROR_CODES.DUPLICATE_BOOKING);
    });

    it('rejects booking with invalid co-buyer share total (!= 100%)', async () => {
      let prop2Id = '';
      let coBuyerId = '';
      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const p = await tx.property.create({
          data: {
            companyId: ctx.companyAId,
            projectId: (await tx.project.findFirstOrThrow({ where: { companyId: ctx.companyAId } }))
              .id,
            code: 'PLOT-BKG-LC-02',
            type: 'PLOT',
            status: PROPERTY_STATUSES.AVAILABLE,
            areaSqft: 1800,
            basePricePaisa: 8_000_000_0n,
            netPricePaisa: 8_000_000_0n,
          },
        });
        prop2Id = p.id;

        const cb = await tx.customer.create({
          data: {
            companyId: ctx.companyAId,
            customerNumber: 'CUST-BKG-LC-002',
            name: 'Rashida Begum',
            phone: '+8801812345678',
          },
        });
        coBuyerId = cb.id;
      });

      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId: prop2Id,
          customerId: testCustomerId,
          coBuyers: [
            { customerId: testCustomerId, sharePercentage: 60.0 },
            { customerId: coBuyerId, sharePercentage: 30.0 },
          ],
        });

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });
  });

  describe('S4 & AT-17: Cancel Booking & Property Status Release', () => {
    it('AT-17: cancels pre-confirmation booking, releasing property to Available', async () => {
      let propCanId = '';
      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const p = await tx.property.create({
          data: {
            companyId: ctx.companyAId,
            projectId: (await tx.project.findFirstOrThrow({ where: { companyId: ctx.companyAId } }))
              .id,
            code: 'PLOT-BKG-CANCEL-01',
            type: 'PLOT',
            status: PROPERTY_STATUSES.AVAILABLE,
            areaSqft: 2100,
            basePricePaisa: 9_000_000_0n,
            netPricePaisa: 9_000_000_0n,
          },
        });
        propCanId = p.id;
      });

      const bkgRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId: propCanId,
          customerId: testCustomerId,
        });

      expect(bkgRes.status).toBe(HttpStatus.CREATED);
      const bookingId = bkgRes.body.data.id;

      const cancelRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/sales/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          reason: 'Customer requested cancellation before booking money deposit',
        });

      expect(cancelRes.status).toBe(HttpStatus.OK);
      expect(cancelRes.body.data.status).toBe(BOOKING_STATUSES.CANCELLED);
      expect(cancelRes.body.data.cancelledAt).toBeDefined();

      const property = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.property.findUniqueOrThrow({ where: { id: propCanId } }),
      );
      expect(property.status).toBe(PROPERTY_STATUSES.AVAILABLE);

      // Re-booking the property now succeeds
      const rebookRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId: propCanId,
          customerId: testCustomerId,
        });

      expect(rebookRes.status).toBe(HttpStatus.CREATED);
    });

    it('rejects invalid transition: cancelling an already cancelled booking', async () => {
      const cancelledBkg = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.booking.findFirstOrThrow({
          where: { companyId: ctx.companyAId, status: BOOKING_STATUSES.CANCELLED },
        }),
      );

      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/sales/bookings/${cancelledBkg.id}/cancel`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({ reason: 'Repeated cancellation attempt' });

      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(res.body.error.code).toBe(ERROR_CODES.INVALID_STATE_TRANSITION);
    });
  });
});
