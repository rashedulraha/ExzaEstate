import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostingService } from '../../src/modules/accounting/posting/posting.service.js';
import {
  type AccountingTestContext,
  setupAccountingTestContext,
} from './accounting-test.fixture.js';

function firstJournal<T>(journals: T[]): T {
  const j = journals[0];
  if (!j) throw new Error('Expected at least one journal');
  return j;
}

function findLine<T extends { accountCode: string }>(lines: T[] | undefined, code: string): T {
  if (!lines) throw new Error('Expected lines to be defined');
  const line = lines.find((l) => l.accountCode === code);
  if (!line) throw new Error(`Line with accountCode ${code} not found`);
  return line;
}

describe('A6.4 — Posting Rules: Booking & Payments (AT-04, AT-04b)', () => {
  let ctx: AccountingTestContext;
  let postingService: PostingService;
  let originalPaymentJournalId: string;

  beforeAll(async () => {
    ctx = await setupAccountingTestContext();
    postingService = ctx.app.get(PostingService);
  });

  afterAll(async () => {
    if (ctx) await ctx.close();
  });

  it('S1: BOOKING_CONFIRMED posts Dr 1100 Receivable and Cr 4100 Revenue under ON_BOOKING', async () => {
    const bookingId = '50000000-0000-0000-0000-000000000001';
    const customerId = '60000000-0000-0000-0000-000000000001';
    const netPrice = 500000000n; // ৳50,00,000

    const journals = await postingService.post(
      ctx.companyAId,
      ctx.accountantUserId,
      'BOOKING_CONFIRMED',
      {
        bookingId,
        bookingNumber: 'BK-2026-0001',
        customerId,
        netPricePaisa: netPrice,
        vatPaisa: 0n,
        postingDate: '2026-10-04',
      },
    );
    const journal = firstJournal(journals);

    expect(journal.status).toBe('Posted');
    expect(journal.sourceModule).toBe('sales');
    expect(journal.totalAmount).toBe(netPrice.toString());

    const line1 = findLine(journal.lines, '1100');
    expect(line1.debitPaisa).toBe(netPrice.toString());
    expect(line1.creditPaisa).toBe('0');
    expect(line1.partyType).toBe('CUSTOMER');
    expect(line1.partyId).toBe(customerId);

    const line2 = findLine(journal.lines, '4100');
    expect(line2.debitPaisa).toBe('0');
    expect(line2.creditPaisa).toBe(netPrice.toString());
  });

  it('AT-04b: BOOKING_CONFIRMED credits 2600 Unearned Sales Revenue when ON_HANDOVER', async () => {
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      await tx.companySetting.upsert({
        where: { companyId_key: { companyId: ctx.companyAId, key: 'revenue_recognition' } },
        update: { value: 'ON_HANDOVER' },
        create: { companyId: ctx.companyAId, key: 'revenue_recognition', value: 'ON_HANDOVER' },
      });
    });

    const bookingId = '50000000-0000-0000-0000-000000000002';
    const customerId = '60000000-0000-0000-0000-000000000002';
    const netPrice = 750000000n; // ৳75,00,000

    const journals = await postingService.post(
      ctx.companyAId,
      ctx.accountantUserId,
      'BOOKING_CONFIRMED',
      {
        bookingId,
        bookingNumber: 'BK-2026-0002',
        customerId,
        netPricePaisa: netPrice,
        vatPaisa: 0n,
        postingDate: '2026-10-04',
      },
    );
    const journal = firstJournal(journals);

    expect(journal.status).toBe('Posted');
    const line1 = findLine(journal.lines, '1100');
    expect(line1.debitPaisa).toBe(netPrice.toString());

    const line2 = findLine(journal.lines, '2600');
    expect(line2.creditPaisa).toBe(netPrice.toString());

    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      await tx.companySetting.upsert({
        where: { companyId_key: { companyId: ctx.companyAId, key: 'revenue_recognition' } },
        update: { value: 'ON_BOOKING' },
        create: { companyId: ctx.companyAId, key: 'revenue_recognition', value: 'ON_BOOKING' },
      });
    });
  });

  it('S2: BOOKING_CONFIRMED with VAT and gross discount posts balanced entries', async () => {
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      await tx.companySetting.upsert({
        where: { companyId_key: { companyId: ctx.companyAId, key: 'show_discount_gross' } },
        update: { value: true },
        create: { companyId: ctx.companyAId, key: 'show_discount_gross', value: true },
      });
    });

    const netPrice = 450000000n; // ৳45,00,000
    const discount = 50000000n; // ৳5,00,000
    const vat = 20000000n; // ৳2,00,000

    const journals = await postingService.post(
      ctx.companyAId,
      ctx.accountantUserId,
      'BOOKING_CONFIRMED',
      {
        bookingId: '50000000-0000-0000-0000-000000000003',
        bookingNumber: 'BK-2026-0003',
        customerId: '60000000-0000-0000-0000-000000000003',
        netPricePaisa: netPrice,
        discountPaisa: discount,
        vatPaisa: vat,
        postingDate: '2026-10-04',
      },
    );
    const journal = firstJournal(journals);

    expect(journal.status).toBe('Posted');
    const dr1100 = findLine(journal.lines, '1100');
    const dr5900 = findLine(journal.lines, '5900');
    expect(dr1100.debitPaisa).toBe(netPrice.toString());
    expect(dr5900.debitPaisa).toBe(discount.toString());

    const cr4100 = findLine(journal.lines, '4100');
    const cr2400 = findLine(journal.lines, '2400');
    expect(cr4100.creditPaisa).toBe((netPrice + discount - vat).toString());
    expect(cr2400.creditPaisa).toBe(vat.toString());
  });

  it('AT-04: PAYMENT_POSTED receives ৳5,00,000 -> Dr 1010 Cash and Cr 1100 Receivable', async () => {
    const paymentId = '70000000-0000-0000-0000-000000000001';
    const customerId = '60000000-0000-0000-0000-000000000001';
    const amount = 50000000n; // ৳5,00,000

    const journals = await postingService.post(
      ctx.companyAId,
      ctx.accountantUserId,
      'PAYMENT_POSTED',
      {
        paymentId,
        paymentNumber: 'PAY-2026-0001',
        customerId,
        amountPaisa: amount,
        allocatedPaisa: amount,
        paymentMethod: 'CASH',
        postingDate: '2026-10-04',
      },
    );
    const journal = firstJournal(journals);

    originalPaymentJournalId = journal.id;
    expect(journal.status).toBe('Posted');
    const dr1010 = findLine(journal.lines, '1010');
    const cr1100 = findLine(journal.lines, '1100');
    expect(dr1010.debitPaisa).toBe(amount.toString());
    expect(cr1100.creditPaisa).toBe(amount.toString());
  });

  it('S2: PAYMENT_POSTED with overpayment credits 2200 Customer Advances', async () => {
    const paymentId = '70000000-0000-0000-0000-000000000002';
    const customerId = '60000000-0000-0000-0000-000000000001';
    const totalAmount = 60000000n; // ৳6,00,000
    const allocated = 50000000n; // ৳5,00,000
    const overpayment = 10000000n; // ৳1,00,000

    const journals = await postingService.post(
      ctx.companyAId,
      ctx.accountantUserId,
      'PAYMENT_POSTED',
      {
        paymentId,
        paymentNumber: 'PAY-2026-0002',
        customerId,
        amountPaisa: totalAmount,
        allocatedPaisa: allocated,
        overpaymentPaisa: overpayment,
        paymentMethod: 'BANK_TRANSFER',
        postingDate: '2026-10-04',
      },
    );
    const journal = firstJournal(journals);

    expect(journal.status).toBe('Posted');
    const dr1020 = findLine(journal.lines, '1020');
    const cr1100 = findLine(journal.lines, '1100');
    const cr2200 = findLine(journal.lines, '2200');
    expect(dr1020.debitPaisa).toBe(totalAmount.toString());
    expect(cr1100.creditPaisa).toBe(allocated.toString());
    expect(cr2200.creditPaisa).toBe(overpayment.toString());
  });

  it('S2: PAYMENT_POSTED rejects unallocated suspense when allow_suspense_receipts is false', async () => {
    await expect(
      postingService.post(ctx.companyAId, ctx.accountantUserId, 'PAYMENT_POSTED', {
        paymentId: '70000000-0000-0000-0000-000000000003',
        customerId: '60000000-0000-0000-0000-000000000001',
        amountPaisa: 50000000n,
        allocatedPaisa: 40000000n,
        unallocatedPaisa: 10000000n,
        paymentMethod: 'CASH',
        postingDate: '2026-10-04',
      }),
    ).rejects.toThrow(/allow_suspense_receipts is disabled/);
  });

  it('S2: PAYMENT_REVERSED creates exact mirror reversal entry linked to original journal', async () => {
    const journals = await postingService.post(
      ctx.companyAId,
      ctx.accountantUserId,
      'PAYMENT_REVERSED',
      {
        originalJournalId: originalPaymentJournalId,
        paymentId: '70000000-0000-0000-0000-000000000001',
        reason: 'Cheque bounced or fraudulent payment reversal',
        postingDate: '2026-10-04',
      },
    );
    const reversalJournal = firstJournal(journals);

    expect(reversalJournal.type).toBe('REVERSAL');
    expect(reversalJournal.status).toBe('Posted');
    const dr1100 = findLine(reversalJournal.lines, '1100');
    const cr1010 = findLine(reversalJournal.lines, '1010');
    expect(dr1100.debitPaisa).toBe('50000000');
    expect(cr1010.creditPaisa).toBe('50000000');
  });

  it('S2: CHEQUE_CLEARED posts Dr 1020 Bank and Cr 1040 Uncleared Cheques', async () => {
    const journals = await postingService.post(
      ctx.companyAId,
      ctx.accountantUserId,
      'CHEQUE_CLEARED',
      {
        chequeId: '70000000-0000-0000-0000-000000000004',
        amountPaisa: 30000000n, // ৳3,00,000
        postingDate: '2026-10-04',
      },
    );
    const journal = firstJournal(journals);

    expect(journal.status).toBe('Posted');
    const dr1020 = findLine(journal.lines, '1020');
    const cr1040 = findLine(journal.lines, '1040');
    expect(dr1020.debitPaisa).toBe('30000000');
    expect(cr1040.creditPaisa).toBe('30000000');
  });
});
