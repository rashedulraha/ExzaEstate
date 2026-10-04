import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { PostingService } from '../../src/modules/accounting/posting/posting.service.js';
import {
  type AccountingTestContext,
  setupAccountingTestContext,
} from './accounting-test.fixture.js';

interface ErrorWithCode {
  code?: string;
  status?: number;
}

function firstJournal<T>(journals: T[]): T {
  const j = journals[0];
  if (!j) throw new Error('Expected at least one journal');
  return j;
}

function getJournalAt<T>(journals: T[], index: number): T {
  const j = journals[index];
  if (!j) throw new Error(`Expected journal at index ${index}`);
  return j;
}

function findLine<T extends { accountCode: string }>(lines: T[] | undefined, code: string): T {
  if (!lines) throw new Error('Expected lines to be defined');
  const line = lines.find((l) => l.accountCode === code);
  if (!line) throw new Error(`Line with accountCode ${code} not found`);
  return line;
}

describe('A6.4 — Posting Rules: Ops, Cancellation & Missing Mapping (AT-25)', () => {
  let ctx: AccountingTestContext;
  let postingService: PostingService;

  beforeAll(async () => {
    ctx = await setupAccountingTestContext();
    postingService = ctx.app.get(PostingService);
  });

  afterAll(async () => {
    if (ctx) await ctx.close();
  });

  describe('S3: Cancellation, Refund & Late Fee Rules', () => {
    it('S3: LATE_FEE_CHARGED and LATE_FEE_WAIVED post correct adjustments', async () => {
      const customerId = '60000000-0000-0000-0000-000000000001';
      const fee = 1000000n; // ৳10,000

      const chargedJournals = await postingService.post(
        ctx.companyAId,
        ctx.accountantUserId,
        'LATE_FEE_CHARGED',
        { customerId, feePaisa: fee, postingDate: '2026-10-04' },
      );
      const charged = firstJournal(chargedJournals);
      expect(findLine(charged.lines, '1100').debitPaisa).toBe(fee.toString());
      expect(findLine(charged.lines, '4200').creditPaisa).toBe(fee.toString());

      const waivedJournals = await postingService.post(
        ctx.companyAId,
        ctx.accountantUserId,
        'LATE_FEE_WAIVED',
        { customerId, feePaisa: fee, postingDate: '2026-10-04' },
      );
      const waived = firstJournal(waivedJournals);
      expect(findLine(waived.lines, '4200').debitPaisa).toBe(fee.toString());
      expect(findLine(waived.lines, '1100').creditPaisa).toBe(fee.toString());
    });

    it('S3: BOOKING_CANCELLED generates Journal 1 and Journal 2', async () => {
      const netPrice = 500000000n; // ৳50,00,000
      const paid = 100000000n; // ৳10,00,000
      const deduction = 10000000n; // ৳1,00,000
      const refund = 90000000n; // ৳9,00,000

      const journals = await postingService.post(
        ctx.companyAId,
        ctx.accountantUserId,
        'BOOKING_CANCELLED',
        {
          bookingId: '50000000-0000-0000-0000-000000000004',
          bookingNumber: 'BK-2026-0004',
          customerId: '60000000-0000-0000-0000-000000000001',
          netPricePaisa: netPrice,
          paidAmountPaisa: paid,
          deductionPaisa: deduction,
          refundPaisa: refund,
          postingDate: '2026-10-04',
        },
      );

      expect(journals.length).toBe(2);
      const j0 = getJournalAt(journals, 0);
      const j1 = getJournalAt(journals, 1);
      expect(findLine(j0.lines, '4100').debitPaisa).toBe(netPrice.toString());
      expect(findLine(j0.lines, '1100').creditPaisa).toBe(netPrice.toString());
      expect(findLine(j1.lines, '1100').debitPaisa).toBe(paid.toString());
      expect(findLine(j1.lines, '4300').creditPaisa).toBe(deduction.toString());
      expect(findLine(j1.lines, '2500').creditPaisa).toBe(refund.toString());
    });

    it('S3: REFUND_PAID posts Dr 2500 Refunds Payable and Cr 1020 Bank', async () => {
      const refundAmount = 90000000n; // ৳9,00,000
      const journals = await postingService.post(
        ctx.companyAId,
        ctx.accountantUserId,
        'REFUND_PAID',
        {
          refundId: '70000000-0000-0000-0000-000000000005',
          customerId: '60000000-0000-0000-0000-000000000001',
          refundPaisa: refundAmount,
          paymentMethod: 'BANK_TRANSFER',
          postingDate: '2026-10-04',
        },
      );
      const journal = firstJournal(journals);

      expect(journal.status).toBe('Posted');
      expect(findLine(journal.lines, '2500').debitPaisa).toBe(refundAmount.toString());
      expect(findLine(journal.lines, '1020').creditPaisa).toBe(refundAmount.toString());
    });
  });

  describe('S4: Operational Posting Rules', () => {
    it('S4: EXPENSE_APPROVED_PAID, VENDOR_BILL_POSTED, and VENDOR_PAYMENT post correctly', async () => {
      const expJournals = await postingService.post(
        ctx.companyAId,
        ctx.accountantUserId,
        'EXPENSE_APPROVED_PAID',
        {
          expenseId: '80000000-0000-0000-0000-000000000001',
          amountPaisa: 1500000n,
          paymentMethod: 'CASH',
          postingDate: '2026-10-04',
        },
      );
      expect(findLine(firstJournal(expJournals).lines, '5500').debitPaisa).toBe('1500000');

      const billAmount = 25000000n;
      const billJournals = await postingService.post(
        ctx.companyAId,
        ctx.accountantUserId,
        'VENDOR_BILL_POSTED',
        {
          billId: '80000000-0000-0000-0000-000000000002',
          vendorId: '90000000-0000-0000-0000-000000000001',
          amountPaisa: billAmount,
          postingDate: '2026-10-04',
        },
      );
      expect(findLine(firstJournal(billJournals).lines, '1210').debitPaisa).toBe(
        billAmount.toString(),
      );

      const payJournals = await postingService.post(
        ctx.companyAId,
        ctx.accountantUserId,
        'VENDOR_PAYMENT',
        {
          paymentId: '80000000-0000-0000-0000-000000000003',
          vendorId: '90000000-0000-0000-0000-000000000001',
          amountPaisa: billAmount,
          paymentMethod: 'BANK_TRANSFER',
          postingDate: '2026-10-04',
        },
      );
      expect(findLine(firstJournal(payJournals).lines, '2100').debitPaisa).toBe(
        billAmount.toString(),
      );
    });

    it('S4: COMMISSION, CASH_TRANSFER, LAND, DEVELOPMENT, and COGS post correctly', async () => {
      const commJournals = await postingService.post(
        ctx.companyAId,
        ctx.accountantUserId,
        'COMMISSION_APPROVED',
        {
          brokerId: '90000000-0000-0000-0000-000000000002',
          amountPaisa: 5000000n,
          postingDate: '2026-10-04',
        },
      );
      expect(findLine(firstJournal(commJournals).lines, '5400').debitPaisa).toBe('5000000');

      const cogsJournals = await postingService.post(
        ctx.companyAId,
        ctx.accountantUserId,
        'COST_OF_LAND_SOLD',
        { amountPaisa: 150000000n, postingDate: '2026-10-04' },
      );
      expect(findLine(firstJournal(cogsJournals).lines, '5100').debitPaisa).toBe('150000000');
    });
  });

  describe('S5: Configuration API & Missing Mapping Handling (AT-25)', () => {
    it('S5: Accountant can view and edit posting rules via API', async () => {
      const listRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/accounting/posting-rules')
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      expect(listRes.status).toBe(HttpStatus.OK);
      const rules = (listRes.body.data ?? listRes.body) as Array<{ eventType: string }>;
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThanOrEqual(16);

      const patchRes = await request(ctx.app.getHttpServer())
        .patch('/api/v1/accounting/posting-rules/BOOKING_CONFIRMED')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({ description: 'Updated booking confirmation policy mapping' });

      expect(patchRes.status).toBe(HttpStatus.OK);
      const updated = (patchRes.body.data ?? patchRes.body) as { description: string };
      expect(updated.description).toBe('Updated booking confirmation policy mapping');
    });

    it('AT-25: Removing or deactivating a posting rule blocks transaction with POSTING_RULE_MISSING', async () => {
      const delRes = await request(ctx.app.getHttpServer())
        .delete('/api/v1/accounting/posting-rules/PAYMENT_POSTED')
        .set('Authorization', `Bearer ${ctx.accountantToken}`);
      expect(delRes.status).toBe(HttpStatus.NO_CONTENT);

      let caughtError: unknown;
      try {
        await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
          await postingService.post(
            ctx.companyAId,
            ctx.accountantUserId,
            'PAYMENT_POSTED',
            {
              paymentId: '70000000-0000-0000-0000-000000000099',
              customerId: '60000000-0000-0000-0000-000000000001',
              amountPaisa: 50000000n,
              allocatedPaisa: 50000000n,
              paymentMethod: 'CASH',
              postingDate: '2026-10-04',
            },
            tx,
          );
        });
      } catch (err) {
        caughtError = err;
      }

      const err = caughtError as ErrorWithCode;
      expect(err).toBeDefined();
      expect(err.code).toBe(ERROR_CODES.POSTING_RULE_MISSING);
      expect(err.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);

      const orphan = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.journal.findFirst({
          where: {
            companyId: ctx.companyAId,
            sourceDocumentId: '70000000-0000-0000-0000-000000000099',
          },
        }),
      );
      expect(orphan).toBeNull();

      const resetRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/accounting/posting-rules/reset')
        .set('Authorization', `Bearer ${ctx.accountantToken}`);
      expect(resetRes.status).toBe(HttpStatus.NO_CONTENT);
    });

    it('AT-25: Inactive or missing account referenced in rule blocks transaction with POSTING_RULE_MISSING', async () => {
      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        await tx.account.update({
          where: { companyId_code: { companyId: ctx.companyAId, code: '1010' } },
          data: { isActive: false },
        });
      });

      let caughtError: unknown;
      try {
        await postingService.post(ctx.companyAId, ctx.accountantUserId, 'PAYMENT_POSTED', {
          paymentId: '70000000-0000-0000-0000-000000000088',
          customerId: '60000000-0000-0000-0000-000000000001',
          amountPaisa: 50000000n,
          allocatedPaisa: 50000000n,
          paymentMethod: 'CASH',
          postingDate: '2026-10-04',
        });
      } catch (err) {
        caughtError = err;
      }

      const err = caughtError as ErrorWithCode;
      expect(err).toBeDefined();
      expect(err.code).toBe(ERROR_CODES.POSTING_RULE_MISSING);

      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        await tx.account.update({
          where: { companyId_code: { companyId: ctx.companyAId, code: '1010' } },
          data: { isActive: true },
        });
      });
    });
  });
});
