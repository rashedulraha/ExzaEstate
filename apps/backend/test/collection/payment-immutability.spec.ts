import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type CollectionTestContext,
  setupCollectionTestContext,
} from './collection-test.fixture.js';

describe('A5.2 & RULE-IMMUTABLE: Payment Immutability Database Trigger', () => {
  let ctx: CollectionTestContext;
  let draftPaymentId: string;
  let postedPaymentId: string;

  beforeAll(async () => {
    ctx = await setupCollectionTestContext();

    // Create 1 draft payment and 1 posted payment directly in database
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const p1 = await tx.payment.create({
        data: {
          companyId: ctx.companyAId,
          paymentNumber: 'PAY-TEST-IMM-01',
          bookingId: ctx.testBookingId,
          customerId: ctx.testCustomerId,
          amountPaisa: 500_000_0n,
          paymentType: 'BOOKING_MONEY',
          paymentMethod: 'BANK',
          status: 'Draft',
          isDraft: true,
          notes: 'Initial draft payment',
          createdById: ctx.execUserId,
        },
      });
      draftPaymentId = p1.id;

      const p2 = await tx.payment.create({
        data: {
          companyId: ctx.companyAId,
          paymentNumber: 'PAY-TEST-IMM-02',
          bookingId: ctx.testBookingId,
          customerId: ctx.testCustomerId,
          amountPaisa: 500_000_0n,
          paymentType: 'BOOKING_MONEY',
          paymentMethod: 'BANK',
          status: 'Posted',
          isDraft: false,
          postedAt: new Date(),
          postedById: ctx.accountantUserId,
          notes: 'Posted payment',
          createdById: ctx.execUserId,
        },
      });
      postedPaymentId = p2.id;
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('allows updates to Draft payments at the database level', async () => {
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const updated = await tx.payment.update({
        where: { id: draftPaymentId },
        data: { notes: 'Updated notes while still in Draft' },
      });
      expect(updated.notes).toBe('Updated notes while still in Draft');
    });
  });

  it('allows the single transition from Draft to Posted at the database level', async () => {
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const updated = await tx.payment.update({
        where: { id: draftPaymentId },
        data: {
          status: 'Posted',
          isDraft: false,
          postedAt: new Date(),
          postedById: ctx.accountantUserId,
        },
      });
      expect(updated.status).toBe('Posted');
      expect(updated.isDraft).toBe(false);
    });
  });

  it('S3 & Acceptance: database trigger REJECTS any UPDATE on a Posted payment', async () => {
    await expect(
      ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        await tx.payment.update({
          where: { id: postedPaymentId },
          data: { notes: 'Malicious modification of posted payment' },
        });
      }),
    ).rejects.toThrow(/Posted payments are immutable and cannot be updated/);
  });

  it('S3: database trigger REJECTS any direct SQL query updating a Posted payment', async () => {
    await expect(
      ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        await tx.$executeRawUnsafe(
          `UPDATE payments SET notes = 'Raw SQL tamper' WHERE id = $1::uuid`,
          postedPaymentId,
        );
      }),
    ).rejects.toThrow(/Posted payments are immutable and cannot be updated/);
  });

  it('S3: database trigger REJECTS DELETE on any payment (Draft or Posted)', async () => {
    await expect(
      ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        await tx.payment.delete({
          where: { id: postedPaymentId },
        });
      }),
    ).rejects.toThrow(/Payments cannot be deleted|permission denied for table payments/);
  });

  it('database trigger REJECTS UPDATE on terminal status (Cancelled)', async () => {
    let cancelledId = '';
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const p = await tx.payment.create({
        data: {
          companyId: ctx.companyAId,
          paymentNumber: 'PAY-TEST-IMM-03',
          customerId: ctx.testCustomerId,
          amountPaisa: 100_000_0n,
          paymentType: 'BOOKING_MONEY',
          paymentMethod: 'CASH',
          status: 'Cancelled',
          isDraft: false,
          createdById: ctx.execUserId,
        },
      });
      cancelledId = p.id;
    });

    await expect(
      ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        await tx.payment.update({
          where: { id: cancelledId },
          data: { notes: 'Cannot update cancelled payment' },
        });
      }),
    ).rejects.toThrow(/Terminal payments cannot be updated/);
  });
});
