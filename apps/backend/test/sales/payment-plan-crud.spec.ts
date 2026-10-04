import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { setupSalesTestContext, type SalesTestContext } from './sales-test.fixture.js';

describe('Sales Payment Plans & Installment Engine (Task A4.1)', () => {
  let ctx: SalesTestContext;
  let createdTemplateId: string;

  beforeAll(async () => {
    ctx = await setupSalesTestContext();
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.close();
    }
  });

  describe('S1 & S4: Preview Endpoint & AT-23 Acceptance Test', () => {
    it('AT-23: splits ৳1,00,000 in 3 installments = 33,333.34 + 33,333.33 + 33,333.33 via preview endpoint', async () => {
      // ৳1,00,000 = 10,000,000 paisa
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/payment-plans/preview')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          netPricePaisa: '10000000',
          bookingAmountPaisa: '0',
          downPaymentPaisa: '0',
          installmentCount: 3,
          firstDueDate: '2026-03-01',
          frequency: 'MONTHLY',
          minBookingPct: 0,
        })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.netPricePaisa).toBe('10000000');
      expect(data.netPriceFormatted).toBe('৳1,00,000.00');
      expect(data.totalScheduledPaisa).toBe('10000000');
      expect(data.installmentCount).toBe(3);

      expect(data.items).toHaveLength(3);
      expect(data.items[0].amountPaisa).toBe('3333334');
      expect(data.items[0].amountFormatted).toBe('৳33,333.34');
      expect(data.items[1].amountPaisa).toBe('3333333');
      expect(data.items[1].amountFormatted).toBe('৳33,333.33');
      expect(data.items[2].amountPaisa).toBe('3333333');
      expect(data.items[2].amountFormatted).toBe('৳33,333.33');

      const sum = data.items.reduce(
        (acc: bigint, it: { amountPaisa: string }) => acc + BigInt(it.amountPaisa),
        0n,
      );
      expect(sum.toString()).toBe('10000000');
    });

    it('S3: enforces min_booking_pct validation and rejects lower booking amounts', async () => {
      // 10% of ৳50,00,000 (500000000 paisa) is 50000000 paisa
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/payment-plans/preview')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          netPricePaisa: '500000000',
          bookingAmountPaisa: '40000000', // Only 8% -> below 10%
          installmentCount: 24,
          firstDueDate: '2026-04-01',
          minBookingPct: 10,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(res.body.error.message).toContain('Booking amount cannot be less than 10%');
    });

    it('previews schedule with custom milestones without losing any paisa', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/payment-plans/preview')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          netPricePaisa: '100000000', // ৳10,00,000
          bookingAmountPaisa: '10000000', // ৳1,00,000 (10%)
          firstDueDate: '2026-05-01',
          customMilestones: [
            { name: 'Piling', percentage: 33 },
            { name: 'Roof', percentage: 33 },
            { name: 'Finishing', percentage: 34 },
          ],
        })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.totalScheduledPaisa).toBe('100000000');
      expect(data.items).toHaveLength(4); // 1 booking + 3 milestones
      expect(data.items[0].type).toBe('BOOKING_AMOUNT');
      expect(data.items[1].name).toBe('Piling');
      expect(data.items[2].name).toBe('Roof');
      expect(data.items[3].name).toBe('Finishing');
    });
  });

  describe('S2: Payment Plan Template Master & CRUD', () => {
    it('creates a new payment plan template as Managing Director', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/payment-plans')
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          code: 'TEST-36M',
          name: 'Test 36-Month Plan',
          description: 'Special equal installment scheme for test',
          planType: 'EQUAL_INSTALLMENTS',
          frequency: 'MONTHLY',
          installmentCount: 36,
          minBookingPct: 10,
          downPaymentPct: 5,
          isActive: true,
          isDefault: true,
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.success).toBe(true);
      const tpl = res.body.data;
      expect(tpl.id).toBeDefined();
      expect(tpl.code).toBe('TEST-36M');
      expect(tpl.name).toBe('Test 36-Month Plan');
      expect(tpl.installmentCount).toBe(36);
      expect(tpl.isDefault).toBe(true);

      createdTemplateId = tpl.id;
    });

    it('rejects template creation for Executive without settings:edit permission (403 Forbidden)', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/payment-plans')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          code: 'UNAUTH-12M',
          name: 'Unauthorized Template',
          installmentCount: 12,
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('rejects duplicate template code within the same company (409 Conflict)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/payment-plans')
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          code: 'TEST-36M',
          name: 'Duplicate Code Template',
          installmentCount: 36,
        })
        .expect(HttpStatus.CONFLICT);

      expect(res.body.error.code).toBe(ERROR_CODES.CONFLICT);
    });

    it('lists templates for company with search and filtering', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/sales/payment-plans?search=36M')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].code).toBe('TEST-36M');
    });

    it('previews schedule using templateId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/payment-plans/preview')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          templateId: createdTemplateId,
          netPricePaisa: '360000000', // ৳36,00,000
          firstDueDate: '2026-06-01',
        })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.installmentCount).toBe(36);
      expect(data.totalScheduledPaisa).toBe('360000000');
      // Down payment pct is 5%, booking pct is 10%
      expect(data.bookingAmountPaisa).toBe('36000000'); // 10% of 360M
      expect(data.downPaymentPaisa).toBe('18000000'); // 5% of 360M
    });

    it('updates payment plan template name and configuration', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/sales/payment-plans/${createdTemplateId}`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          name: 'Renamed Test Plan',
          installmentCount: 48,
        })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Renamed Test Plan');
      expect(res.body.data.installmentCount).toBe(48);
    });

    it('prevents deleting default template and allows deletion after setting another default', async () => {
      // 1. Trying to delete default template fails with 400
      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/sales/payment-plans/${createdTemplateId}`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .expect(HttpStatus.BAD_REQUEST);

      // 2. Unmark default
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/sales/payment-plans/${createdTemplateId}`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({ isDefault: false })
        .expect(HttpStatus.OK);

      // 3. Now delete succeeds
      const res = await request(ctx.app.getHttpServer())
        .delete(`/api/v1/sales/payment-plans/${createdTemplateId}`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdTemplateId);

      // 4. GET by ID returns 404
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/payment-plans/${createdTemplateId}`)
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('RLS: isolates templates between different tenant companies', async () => {
      // Create a template in Company A
      const createRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/payment-plans')
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          code: 'COMP-A-PLAN',
          name: 'Company A Only Plan',
          installmentCount: 12,
        })
        .expect(HttpStatus.CREATED);

      const templateAId = createRes.body.data.id;

      // Company B attempts to retrieve Company A's template -> 404
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/payment-plans/${templateAId}`)
        .set('Authorization', `Bearer ${ctx.companyBToken}`)
        .expect(HttpStatus.NOT_FOUND);

      // Company B lists templates -> does not include Company A's template
      const listRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/sales/payment-plans')
        .set('Authorization', `Bearer ${ctx.companyBToken}`)
        .expect(HttpStatus.OK);

      const ids = listRes.body.data.items.map((it: { id: string }) => it.id);
      expect(ids).not.toContain(templateAId);
    });
  });
});
