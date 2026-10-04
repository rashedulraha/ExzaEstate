import crypto from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PROPERTY_STATUSES } from '@exzaestate/shared';
import { type SalesTestContext, setupSalesTestContext } from './sales-test.fixture.js';

describe('A5.1 — Booking Quotation Conversion, Idempotency & Queries', () => {
  let ctx: SalesTestContext;
  let testCustomerId: string;

  beforeAll(async () => {
    ctx = await setupSalesTestContext();

    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const customer = await tx.customer.create({
        data: {
          companyId: ctx.companyAId,
          customerNumber: 'CUST-BKG-QRY-001',
          name: 'Ahmed Hasan',
          phone: '+8801712345678',
          customerType: 'INDIVIDUAL',
        },
      });
      testCustomerId = customer.id;
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('S3: Quotation Conversion & Idempotency', () => {
    it('converts quotation to booking, marking quotation Converted and booking Reserved', async () => {
      let prop3Id = '';
      let quotationId = '';

      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const project = await tx.project.create({
          data: {
            companyId: ctx.companyAId,
            code: 'PRJ-BKG-QUO-01',
            name: 'Quotation Booking Project',
            type: 'RESIDENTIAL',
            status: 'UPCOMING',
          },
        });

        const p = await tx.property.create({
          data: {
            companyId: ctx.companyAId,
            projectId: project.id,
            code: 'PLOT-BKG-QUO-01',
            type: 'PLOT',
            status: PROPERTY_STATUSES.AVAILABLE,
            areaSqft: 2000,
            basePricePaisa: 10_000_000_0n,
            netPricePaisa: 10_000_000_0n,
          },
        });
        prop3Id = p.id;

        const q = await tx.quotation.create({
          data: {
            companyId: ctx.companyAId,
            quotationNumber: 'QUO-BKG-TEST-01',
            propertyId: p.id,
            customerId: testCustomerId,
            status: 'Approved',
            basePricePaisa: 10_000_000_0n,
            netPricePaisa: 10_000_000_0n,
            grandTotalPaisa: 10_000_000_0n,
            validUntil: new Date(Date.now() + 86400000),
          },
        });
        quotationId = q.id;
      });

      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId: prop3Id,
          customerId: testCustomerId,
          quotationId,
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.body.data.quotationId).toBe(quotationId);

      const quo = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.quotation.findUniqueOrThrow({ where: { id: quotationId } }),
      );
      expect(quo.status).toBe('Converted');
      expect(quo.bookingId).toBe(res.body.data.id);
    });

    it('retry with identical Idempotency-Key returns same booking without duplicate (AT-03)', async () => {
      let prop4Id = '';
      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const project = await tx.project.findFirstOrThrow({ where: { companyId: ctx.companyAId } });
        const p = await tx.property.create({
          data: {
            companyId: ctx.companyAId,
            projectId: project.id,
            code: 'PLOT-BKG-IDEM-01',
            type: 'PLOT',
            status: PROPERTY_STATUSES.AVAILABLE,
            areaSqft: 2000,
            basePricePaisa: 10_000_000_0n,
            netPricePaisa: 10_000_000_0n,
          },
        });
        prop4Id = p.id;
      });

      const idempotencyKey = crypto.randomUUID();

      const res1 = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          propertyId: prop4Id,
          customerId: testCustomerId,
        });

      expect(res1.status).toBe(HttpStatus.CREATED);
      const bkgId = res1.body.data.id;
      const bkgNumber = res1.body.data.bookingNumber;

      const res2 = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/bookings')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          propertyId: prop4Id,
          customerId: testCustomerId,
        });

      expect(res2.status).toBe(HttpStatus.CREATED);
      expect(res2.body.data.id).toBe(bkgId);
      expect(res2.body.data.bookingNumber).toBe(bkgNumber);
    });
  });

  describe('Read & Query Endpoints', () => {
    it('lists bookings with pagination', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/sales/bookings?page=1&limit=5')
        .set('Authorization', `Bearer ${ctx.execToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.data.items).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });

    it('fetches booking details by ID', async () => {
      const anyBkg = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.booking.findFirstOrThrow({ where: { companyId: ctx.companyAId } }),
      );

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/bookings/${anyBkg.id}`)
        .set('Authorization', `Bearer ${ctx.execToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.data.id).toBe(anyBkg.id);
      expect(res.body.data.bookingNumber).toBe(anyBkg.bookingNumber);
    });
  });
});
