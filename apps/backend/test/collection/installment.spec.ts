import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INSTALLMENT_PAYMENT_STATES, INSTALLMENT_TIMING_STATES } from '@exzaestate/shared';
import {
  type CollectionTestContext,
  setupCollectionTestContext,
} from './collection-test.fixture.js';

describe('A7.1 — Installment Schedule Persistence & Timing State', () => {
  let ctx: CollectionTestContext;

  beforeAll(async () => {
    ctx = await setupCollectionTestContext();
  }, 60000);

  afterAll(async () => {
    await ctx?.close();
  });

  it('generates and persists installment schedule for a booking', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/collection/installments/generate')
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send({
        bookingId: ctx.testBookingId,
        firstDueDate: '2026-11-01',
        installmentCount: 10,
        frequency: 'MONTHLY',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.bookingId).toBe(ctx.testBookingId);
    expect(data.totalInstallments).toBe(10);
    expect(data.items).toHaveLength(10);

    // Initial state check
    for (const item of data.items) {
      expect(item.paymentState).toBe(INSTALLMENT_PAYMENT_STATES.UNPAID);
      expect(item.remainingAmountPaisa).toBe(item.amountPaisa);
    }
  });

  it('AT-05: ৳3,00,000 installment with ৳1,00,000 paid before due is Partially Paid · Upcoming, remaining ৳2,00,000', async () => {
    // 1. Fetch current schedule
    const scheduleRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/collection/installments/booking/${ctx.testBookingId}`)
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    expect(scheduleRes.status).toBe(200);
    const firstInstallment = scheduleRes.body.data.items[0];
    expect(firstInstallment).toBeDefined();

    // 2. Set installment amount to ৳3,00,000 (30,000,000 paisa) and paid to ৳1,00,000 (10,000,000 paisa)
    // with due date in the future (2026-11-01) vs referenceDate 2026-10-15
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      await tx.installment.update({
        where: { id: firstInstallment.id },
        data: {
          amountPaisa: 30000000n,
          paidAmountPaisa: 10000000n,
          remainingAmountPaisa: 20000000n,
          paymentState: 'Partially Paid',
          dueDate: new Date('2026-11-01'),
        },
      });
    });

    // 3. Query with referenceDate before due date
    const getRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/collection/installments/${firstInstallment.id}?referenceDate=2026-10-15`)
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    expect(getRes.status).toBe(200);
    const inst = getRes.body.data;
    expect(inst.paymentState).toBe(INSTALLMENT_PAYMENT_STATES.PARTIALLY_PAID);
    expect(inst.timingState).toBe(INSTALLMENT_TIMING_STATES.UPCOMING);
    expect(inst.statusLabel).toBe('Partially Paid · Upcoming');
    expect(inst.remainingAmountPaisa).toBe('20000000');
    expect(inst.remainingAmountFormatted).toBe('৳2,00,000.00');
  });

  it('derives Overdue and exact overdue days when reference date is past due date', async () => {
    const scheduleRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/collection/installments/booking/${ctx.testBookingId}`)
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    const firstInstallment = scheduleRes.body.data.items[0];

    // Reference date 12 days after due date 2026-11-01 -> 2026-11-13
    const getRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/collection/installments/${firstInstallment.id}?referenceDate=2026-11-13`)
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    expect(getRes.status).toBe(200);
    const inst = getRes.body.data;
    expect(inst.paymentState).toBe(INSTALLMENT_PAYMENT_STATES.PARTIALLY_PAID);
    expect(inst.timingState).toBe(INSTALLMENT_TIMING_STATES.OVERDUE);
    expect(inst.overdueDays).toBe(12);
    expect(inst.statusLabel).toBe('Partially Paid · Overdue 12 days');
  });

  it('queries installments with pagination and filters', async () => {
    const queryRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/collection/installments?bookingId=${ctx.testBookingId}&limit=5`)
      .set('Authorization', `Bearer ${ctx.execToken}`);

    expect(queryRes.status).toBe(200);
    expect(queryRes.body.data.items).toHaveLength(5);
    expect(queryRes.body.data.total).toBe(10);
  });
});
