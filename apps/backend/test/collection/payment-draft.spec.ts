import crypto from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES, PAYMENT_STATUSES } from '@exzaestate/shared';
import {
  type CollectionTestContext,
  setupCollectionTestContext,
} from './collection-test.fixture.js';

describe('A5.2 — Payment Entity & Draft Booking Payments', () => {
  let ctx: CollectionTestContext;
  let createdPaymentId: string;

  beforeAll(async () => {
    ctx = await setupCollectionTestContext();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('S2: Executive submits draft booking-money payment request (201 Created)', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/collection/payments/draft')
      .set('Authorization', `Bearer ${ctx.execToken}`)
      .send({
        bookingId: ctx.testBookingId,
        customerId: ctx.testCustomerId,
        amountPaisa: '50000000', // ৳5,00,000
        paymentType: 'BOOKING_MONEY',
        paymentMethod: 'BANK',
        bankName: 'City Bank Ltd',
        bankBranch: 'Gulshan-2',
        accountNumber: '110-220-334455',
        transactionReference: 'TXN-COL-001',
        notes: 'Booking deposit draft submitted by sales executive',
      });

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(PAYMENT_STATUSES.DRAFT);
    expect(res.body.data.isDraft).toBe(true);
    expect(res.body.data.paymentNumber).toMatch(/^PAY-\d{4}-\d{5}$/);
    expect(res.body.data.amountPaisa).toBe('50000000');
    expect(res.body.data.formattedAmount).toBe('৳5,00,000.00');
    expect(res.body.data.bookingId).toBe(ctx.testBookingId);
    expect(res.body.data.customerId).toBe(ctx.testCustomerId);

    createdPaymentId = res.body.data.id;

    // Verify status history row created
    const history = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.paymentStatusHistory.findMany({ where: { paymentId: createdPaymentId } }),
    );
    expect(history.length).toBe(1);
    expect(history[0]?.toStatus).toBe(PAYMENT_STATUSES.DRAFT);
  });

  it('S2 & Acceptance: Executive CANNOT post payment (403 Forbidden)', async () => {
    // Executive lacks payment:post permission
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/collection/payments/${createdPaymentId}/post`)
      .set('Authorization', `Bearer ${ctx.execToken}`)
      .send({
        notes: 'Unauthorized posting attempt by executive',
      });

    expect(res.status).toBe(HttpStatus.FORBIDDEN);
    expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });

  it('Accountant CAN post the draft payment (200 OK)', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/collection/payments/${createdPaymentId}/post`)
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send({
        notes: 'Deposit slip verified and payment posted by accountant',
      });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(PAYMENT_STATUSES.POSTED);
    expect(res.body.data.isDraft).toBe(false);
    expect(res.body.data.postedAt).toBeDefined();

    // Verify payment in database
    const payment = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.payment.findUniqueOrThrow({ where: { id: createdPaymentId } }),
    );
    expect(payment.status).toBe(PAYMENT_STATUSES.POSTED);
    expect(payment.isDraft).toBe(false);
    expect(payment.postedById).toBe(ctx.accountantUserId);
  });

  it('rejects posting an already posted payment with 400 Bad Request', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/collection/payments/${createdPaymentId}/post`)
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send({
        notes: 'Duplicate posting attempt',
      });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.body.error.code).toBe(ERROR_CODES.INVALID_STATE_TRANSITION);
  });

  it('rejects cheque payment missing chequeNumber or chequeDate with 400 Bad Request', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/collection/payments/draft')
      .set('Authorization', `Bearer ${ctx.execToken}`)
      .send({
        bookingId: ctx.testBookingId,
        customerId: ctx.testCustomerId,
        amountPaisa: '20000000',
        paymentMethod: 'CHEQUE',
        // Missing chequeNumber and chequeDate
      });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it('idempotency: repeating identical draft payment returns same payment (AT-03)', async () => {
    const idempotencyKey = crypto.randomUUID();

    const payload = {
      bookingId: ctx.testBookingId,
      customerId: ctx.testCustomerId,
      amountPaisa: '10000000',
      paymentType: 'BOOKING_MONEY',
      paymentMethod: 'CASH',
      notes: 'Cash payment draft with idempotency',
    };

    const res1 = await request(ctx.app.getHttpServer())
      .post('/api/v1/collection/payments/draft')
      .set('Authorization', `Bearer ${ctx.execToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res1.status).toBe(HttpStatus.CREATED);
    const firstPaymentId = res1.body.data.id;
    const firstPaymentNumber = res1.body.data.paymentNumber;

    const res2 = await request(ctx.app.getHttpServer())
      .post('/api/v1/collection/payments/draft')
      .set('Authorization', `Bearer ${ctx.execToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res2.status).toBe(HttpStatus.CREATED);
    expect(res2.body.data.id).toBe(firstPaymentId);
    expect(res2.body.data.paymentNumber).toBe(firstPaymentNumber);
  });

  it('lists payments with pagination and filter', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/collection/payments?page=1&limit=10')
      .set('Authorization', `Bearer ${ctx.accountantToken}`);

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.data.items).toBeDefined();
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.total).toBeGreaterThan(0);
  });
});
