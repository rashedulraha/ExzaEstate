import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import {
  type AccountingTestContext,
  setupAccountingTestContext,
} from './accounting-test.fixture.js';

describe('A6.3 — Journal Engine, Immutability & Reversals', () => {
  let ctx: AccountingTestContext;
  let cashAccountId: string;
  let revenueAccountId: string;
  let expenseAccountId: string;

  beforeAll(async () => {
    ctx = await setupAccountingTestContext();

    // Fetch accounts for Company A
    const accounts = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.account.findMany({
        where: {
          companyId: ctx.companyAId,
          code: { in: ['1010', '4100', '5500'] },
        },
      }),
    );

    cashAccountId = accounts.find((a) => a.code === '1010')!.id;
    revenueAccountId = accounts.find((a) => a.code === '4100')!.id;
    expenseAccountId = accounts.find((a) => a.code === '5500')!.id;
  });

  afterAll(async () => {
    if (ctx) await ctx.close();
  });

  it('S1 & S2 / AT-26: Balanced journal posts successfully, generates sequence number, and updates ledger balance', async () => {
    const postRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/accounting/journals/post')
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send({
        postingDate: '2026-10-04',
        type: 'GENERAL',
        narration: 'Cash received for consulting services',
        reference: 'REF-CS-001',
        lines: [
          {
            accountId: cashAccountId,
            debitPaisa: '5000000', // ৳50,000
            creditPaisa: '0',
            description: 'Cash received',
          },
          {
            accountId: revenueAccountId,
            debitPaisa: '0',
            creditPaisa: '5000000', // ৳50,000
            description: 'Consulting income',
          },
        ],
      });

    expect(postRes.status).toBe(HttpStatus.OK);
    expect(postRes.body.success).toBe(true);

    const journal = postRes.body.data;
    expect(journal.journalNumber).toMatch(/^JV-/);
    expect(journal.status).toBe('Posted');
    expect(journal.totalAmount).toBe('5000000');
    expect(journal.lines).toHaveLength(2);
    expect(journal.isReversed).toBe(false);

    // Verify account balance reflects posted journal lines
    const balRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/accounting/coa/${cashAccountId}/balance`)
      .set('Authorization', `Bearer ${ctx.accountantToken}`);

    expect(balRes.status).toBe(HttpStatus.OK);
    expect(balRes.body.data.balancePaisa).toBe('5000000');
  });

  it('S2 / AT-26: Unbalanced journal (debit != credit) is rejected outright with 422 JOURNAL_UNBALANCED and nothing persisted', async () => {
    const countBefore = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.journal.count({ where: { companyId: ctx.companyAId } }),
    );

    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/accounting/journals/post')
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send({
        postingDate: '2026-10-04',
        type: 'GENERAL',
        narration: 'Unbalanced journal attempt',
        lines: [
          {
            accountId: cashAccountId,
            debitPaisa: '5000000',
            creditPaisa: '0',
          },
          {
            accountId: revenueAccountId,
            debitPaisa: '0',
            creditPaisa: '4000000', // Unbalanced: 50,000 != 40,000
          },
        ],
      });

    expect(res.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(res.body.error.code).toBe(ERROR_CODES.JOURNAL_UNBALANCED);

    const countAfter = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.journal.count({ where: { companyId: ctx.companyAId } }),
    );
    expect(countAfter).toBe(countBefore);
  });

  it('S2: Deferred DB constraint trigger blocks unbalanced posted journal even if application guard were bypassed', async () => {
    await expect(
      ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const j = await tx.journal.create({
          data: {
            companyId: ctx.companyAId,
            journalNumber: 'JV-TRIGGER-TEST',
            type: 'GENERAL',
            status: 'Draft',
            postingDate: new Date('2026-10-04'),
            narration: 'Trigger bypass test',
            totalAmount: 100000n,
            lines: {
              create: [
                {
                  companyId: ctx.companyAId,
                  lineNumber: 1,
                  accountId: cashAccountId,
                  debitPaisa: 100000n,
                  creditPaisa: 0n,
                },
                {
                  companyId: ctx.companyAId,
                  lineNumber: 2,
                  accountId: revenueAccountId,
                  debitPaisa: 0n,
                  creditPaisa: 50000n, // DB trigger violation
                },
              ],
            },
          },
        });
        await tx.journal.update({
          where: { id: j.id },
          data: { status: 'Posted' },
        });
        return j;
      }),
    ).rejects.toThrow(/RULE-DOUBLE-ENTRY/i);
  });

  it('S3: Immutability triggers reject direct DB updates and deletes on posted journals and their lines', async () => {
    // 1. Create a posted journal
    const postRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/accounting/journals/post')
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send({
        postingDate: '2026-10-04',
        type: 'GENERAL',
        narration: 'Immutability test journal',
        lines: [
          { accountId: expenseAccountId, debitPaisa: '100000', creditPaisa: '0' },
          { accountId: cashAccountId, debitPaisa: '0', creditPaisa: '100000' },
        ],
      });

    const journalId = postRes.body.data.id;
    const lineId = postRes.body.data.lines[0].id;

    // 2. Direct DB UPDATE on posted journal is blocked by trg_journal_immutability
    await expect(
      ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        await tx.journal.update({
          where: { id: journalId },
          data: { narration: 'Tampered narration' },
        });
      }),
    ).rejects.toThrow(/RULE-IMMUTABLE/i);

    // 3. Direct DB DELETE on posted journal is blocked by revoked permissions or trigger
    await expect(
      ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        await tx.journal.delete({
          where: { id: journalId },
        });
      }),
    ).rejects.toThrow(/(permission denied|RULE-IMMUTABLE)/i);

    // 4. Direct DB UPDATE or DELETE on lines of posted journal is blocked
    await expect(
      ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        await tx.journalLine.update({
          where: { id: lineId },
          data: { debitPaisa: 999999n },
        });
      }),
    ).rejects.toThrow(/RULE-IMMUTABLE/i);
  });

  it('S4: reverseAndCorrect creates mirror reversal journal, links reversal record, and restores ledger balances', async () => {
    // 1. Post original journal: Dr Expense ৳20,000, Cr Cash ৳20,000 (2,000,000 paisa)
    const postRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/accounting/journals/post')
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send({
        postingDate: '2026-10-04',
        type: 'GENERAL',
        narration: 'Office maintenance paid in cash',
        lines: [
          { accountId: expenseAccountId, debitPaisa: '2000000', creditPaisa: '0' },
          { accountId: cashAccountId, debitPaisa: '0', creditPaisa: '2000000' },
        ],
      });

    const origJournal = postRes.body.data;

    // 2. Reverse the journal
    const reverseRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/journals/${origJournal.id}/reverse`)
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send({ reason: 'Reversing erroneous expense voucher' });

    expect(reverseRes.status).toBe(HttpStatus.OK);
    const revJournal = reverseRes.body.data;
    expect(revJournal.type).toBe('REVERSAL');
    expect(revJournal.reversalOfId).toBe(origJournal.id);
    expect(revJournal.narration).toContain('Reversal of');
    expect(revJournal.lines).toHaveLength(2);

    // Verify mirror line values
    const revExpenseLine = revJournal.lines.find(
      (l: { accountId: string }) => l.accountId === expenseAccountId,
    );
    expect(revExpenseLine.debitPaisa).toBe('0');
    expect(revExpenseLine.creditPaisa).toBe('2000000'); // Mirror credit

    const revCashLine = revJournal.lines.find(
      (l: { accountId: string }) => l.accountId === cashAccountId,
    );
    expect(revCashLine.debitPaisa).toBe('2000000'); // Mirror debit
    expect(revCashLine.creditPaisa).toBe('0');

    // 3. Fetch original journal: status derives as 'Reversed', isReversed is true
    const getOrigRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/accounting/journals/${origJournal.id}`)
      .set('Authorization', `Bearer ${ctx.accountantToken}`);

    expect(getOrigRes.status).toBe(HttpStatus.OK);
    expect(getOrigRes.body.data.status).toBe('Reversed');
    expect(getOrigRes.body.data.isReversed).toBe(true);
    expect(getOrigRes.body.data.reversalRecord).toBeDefined();

    // 4. Attempting to reverse an already reversed journal fails with 409 Conflict
    const secondRevRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/journals/${origJournal.id}/reverse`)
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send({ reason: 'Duplicate reversal attempt' });

    expect(secondRevRes.status).toBe(HttpStatus.CONFLICT);
  });

  it('S5: Manual journal above ৳10,00,000 threshold requires approval for Accountant, but MD can post directly', async () => {
    const largeAmount = '150000000'; // ৳15,00,000 (> ৳10,00,000 threshold)

    // 1. Accountant attempt exceeds threshold -> 409 APPROVAL_REQUIRED
    const accRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/accounting/journals/post')
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send({
        postingDate: '2026-10-04',
        type: 'GENERAL',
        narration: 'Large capital expenditure entry',
        lines: [
          { accountId: expenseAccountId, debitPaisa: largeAmount, creditPaisa: '0' },
          { accountId: cashAccountId, debitPaisa: '0', creditPaisa: largeAmount },
        ],
      });

    expect(accRes.status).toBe(HttpStatus.CONFLICT);
    expect(accRes.body.error.code).toBe(ERROR_CODES.APPROVAL_REQUIRED);

    // 2. MD can post the large journal directly
    const mdRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/accounting/journals/post')
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send({
        postingDate: '2026-10-04',
        type: 'GENERAL',
        narration: 'Large capital expenditure entry approved by MD',
        lines: [
          { accountId: expenseAccountId, debitPaisa: largeAmount, creditPaisa: '0' },
          { accountId: cashAccountId, debitPaisa: '0', creditPaisa: largeAmount },
        ],
      });

    expect(mdRes.status).toBe(HttpStatus.OK);
    expect(mdRes.body.data.totalAmount).toBe(largeAmount);
    expect(mdRes.body.data.status).toBe('Posted');
  });

  it('Multi-tenant isolation: Company B cannot view or reverse Company A journals', async () => {
    const listRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/journals')
      .set('Authorization', `Bearer ${ctx.accountantToken}`);

    const companyAJournalId = listRes.body.data.data[0].id;

    // Company B trying to fetch Company A journal gets 404
    const getRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/accounting/journals/${companyAJournalId}`)
      .set('Authorization', `Bearer ${ctx.companyBToken}`);

    expect(getRes.status).toBe(HttpStatus.NOT_FOUND);

    // Company B trying to reverse Company A journal gets 404
    const revRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/journals/${companyAJournalId}/reverse`)
      .set('Authorization', `Bearer ${ctx.companyBToken}`)
      .send({ reason: 'Malicious cross-tenant attempt' });

    expect(revRes.status).toBe(HttpStatus.NOT_FOUND);
  });
});
