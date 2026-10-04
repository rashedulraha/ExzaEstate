import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type AccountingTestContext,
  setupAccountingTestContext,
} from './accounting-test.fixture.js';

describe('A6.6 — Financial Reports: Ledger, Trial Balance, Balance Sheet, Income Statement', () => {
  let ctx: AccountingTestContext;
  let cashAccountId: string;
  let payableAccountId: string;
  let capitalAccountId: string;
  let salesRevenueAccountId: string;
  let cogsAccountId: string;
  let adminExpenseAccountId: string;

  beforeAll(async () => {
    ctx = await setupAccountingTestContext();

    const accounts = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.account.findMany({
        where: {
          companyId: ctx.companyAId,
          code: { in: ['1010', '2100', '3100', '4100', '5100', '5500'] },
        },
      }),
    );

    cashAccountId = accounts.find((a) => a.code === '1010')!.id;
    payableAccountId = accounts.find((a) => a.code === '2100')!.id;
    capitalAccountId = accounts.find((a) => a.code === '3100')!.id;
    salesRevenueAccountId = accounts.find((a) => a.code === '4100')!.id;
    cogsAccountId = accounts.find((a) => a.code === '5100')!.id;
    adminExpenseAccountId = accounts.find((a) => a.code === '5500')!.id;

    // Helper to post a test journal
    const postJournal = async (
      postingDate: string,
      narration: string,
      lines: Array<{ accountId: string; debitPaisa: string; creditPaisa: string }>,
    ) => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/accounting/journals/post')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({ postingDate, type: 'GENERAL', narration, lines });
      expect(res.status).toBe(HttpStatus.OK);
    };

    // 1. Owner's Capital Investment (2026-09-01): ৳10,00,000
    await postJournal('2026-09-01', "Owner's Initial Capital", [
      { accountId: cashAccountId, debitPaisa: '100000000', creditPaisa: '0' },
      { accountId: capitalAccountId, debitPaisa: '0', creditPaisa: '100000000' },
    ]);

    // 2. Land Cost on credit (2026-09-15): ৳2,00,000
    await postJournal('2026-09-15', 'Cost of Land Acquisition', [
      { accountId: cogsAccountId, debitPaisa: '20000000', creditPaisa: '0' },
      { accountId: payableAccountId, debitPaisa: '0', creditPaisa: '20000000' },
    ]);

    // 3. Property Sales Revenue in cash (2026-10-01): ৳5,00,000
    await postJournal('2026-10-01', 'Sale of plot 42 cash receipt', [
      { accountId: cashAccountId, debitPaisa: '50000000', creditPaisa: '0' },
      { accountId: salesRevenueAccountId, debitPaisa: '0', creditPaisa: '50000000' },
    ]);

    // 4. Admin Expense paid in cash (2026-10-02): ৳50,000
    await postJournal('2026-10-02', 'Office supplies and utilities', [
      { accountId: adminExpenseAccountId, debitPaisa: '5000000', creditPaisa: '0' },
      { accountId: cashAccountId, debitPaisa: '0', creditPaisa: '5000000' },
    ]);

    // 5. Vendor payment in cash (2026-10-03): ৳1,00,000
    await postJournal('2026-10-03', 'Partial vendor settlement', [
      { accountId: payableAccountId, debitPaisa: '10000000', creditPaisa: '0' },
      { accountId: cashAccountId, debitPaisa: '0', creditPaisa: '10000000' },
    ]);
  });

  afterAll(async () => {
    if (ctx) await ctx.close();
  });

  describe('S1: General Ledger', () => {
    it('returns ledger with running balance, opening balance, and correct calculations', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/accounting/ledger')
        .query({ accountCode: '1010', startDate: '2026-10-01' })
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      const data = res.body.data;
      expect(data.account.code).toBe('1010');
      expect(data.openingBalancePaisa).toBe('100000000'); // ৳10,00,000 from Sep 01
      expect(data.lines).toHaveLength(3); // Oct 01, Oct 02, Oct 03

      // Verify running balances: 100k + 50k = 150k, 150k - 5k = 145k, 145k - 10k = 135k
      expect(data.lines[0].runningBalancePaisa).toBe('150000000');
      expect(data.lines[1].runningBalancePaisa).toBe('145000000');
      expect(data.lines[2].runningBalancePaisa).toBe('135000000');
      expect(data.closingBalancePaisa).toBe('135000000');
    });

    it('queries ledger by specific accountId endpoint', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/accounting/ledger/accounts/${cashAccountId}`)
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.data.account.id).toBe(cashAccountId);
      expect(res.body.data.lines.length).toBeGreaterThanOrEqual(4);
    });

    it('supports keyset cursor pagination with limit and cursor', async () => {
      const page1Res = await request(ctx.app.getHttpServer())
        .get('/api/v1/accounting/ledger')
        .query({ accountCode: '1010', limit: 2 })
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      expect(page1Res.status).toBe(HttpStatus.OK);
      expect(page1Res.body.data.lines).toHaveLength(2);
      expect(page1Res.body.data.hasMore).toBe(true);
      expect(page1Res.body.data.nextCursor).toBeDefined();

      const page2Res = await request(ctx.app.getHttpServer())
        .get('/api/v1/accounting/ledger')
        .query({ accountCode: '1010', limit: 2, cursor: page1Res.body.data.nextCursor })
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      expect(page2Res.status).toBe(HttpStatus.OK);
      expect(page2Res.body.data.lines.length).toBeGreaterThanOrEqual(1);
    });

    it('queues ledger export job with 202 Accepted and returns jobId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/accounting/ledger/export')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({ format: 'PDF', accountCode: '1010' });

      expect(res.status).toBe(HttpStatus.ACCEPTED);
      expect(res.body.data.jobId).toBeDefined();
      expect(res.body.data.status).toBe('QUEUED');
    });
  });

  describe('S2: Trial Balance', () => {
    it('computes balanced trial balance where totalDebitPaisa === totalCreditPaisa', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/trial-balance')
        .query({ asOfDate: '2026-10-04' })
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      const data = res.body.data;
      expect(data.isBalanced).toBe(true);
      expect(data.differencePaisa).toBe('0');
      expect(data.totalDebitPaisa).toBe(data.totalCreditPaisa);
      expect(BigInt(data.totalDebitPaisa)).toBeGreaterThan(0n);
    });

    it('queues trial balance export with 202 Accepted', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/reports/trial-balance/export')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({ format: 'EXCEL' });

      expect(res.status).toBe(HttpStatus.ACCEPTED);
      expect(res.body.data.jobId).toBeDefined();
      expect(res.body.data.status).toBe('QUEUED');
    });
  });

  describe('S3: Balance Sheet & Income Statement', () => {
    it('computes balance sheet where Total Assets === Total Liabilities + Equity', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/balance-sheet')
        .query({ asOfDate: '2026-10-04' })
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      const data = res.body.data;
      expect(data.isBalanced).toBe(true);
      expect(data.assets.totalAssetsPaisa).toBe(data.totalLiabilitiesAndEquityPaisa);
      expect(data.assets.totalAssetsPaisa).toBe('135000000'); // ৳13,50,000 cash
      expect(data.liabilities.totalLiabilitiesPaisa).toBe('10000000'); // ৳1,00,000 AP
      expect(data.equity.currentPeriodNetIncomePaisa).toBe('25000000'); // ৳2,50,000 profit
      expect(data.equity.totalEquityPaisa).toBe('125000000'); // ৳10,00,000 capital + ৳2,50,000 profit
    });

    it('queues balance sheet export with 202 Accepted', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/reports/balance-sheet/export')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({ format: 'PDF' });

      expect(res.status).toBe(HttpStatus.ACCEPTED);
      expect(res.body.data.jobId).toBeDefined();
    });

    it('computes income statement with revenues, COGS, operating expenses, and margins', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/income-statement')
        .query({ startDate: '2026-01-01', endDate: '2026-12-31' })
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      const data = res.body.data;
      expect(data.totalRevenuePaisa).toBe('50000000');
      expect(data.totalCostOfSalesPaisa).toBe('20000000');
      expect(data.grossProfitPaisa).toBe('30000000');
      expect(data.grossProfitMarginPct).toBe(60);
      expect(data.totalOperatingExpensesPaisa).toBe('5000000');
      expect(data.netProfitPaisa).toBe('25000000');
      expect(data.netProfitMarginPct).toBe(50);
    });

    it('queues income statement export with 202 Accepted', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/reports/income-statement/export')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({ format: 'CSV' });

      expect(res.status).toBe(HttpStatus.ACCEPTED);
      expect(res.body.data.jobId).toBeDefined();
    });
  });

  describe('Access Control & Multi-Tenant RLS Isolation', () => {
    it('AT-09: Executive user gets 403 Forbidden on /accounting/ledger', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/accounting/ledger')
        .set('Authorization', `Bearer ${ctx.executiveToken}`);

      expect(res.status).toBe(HttpStatus.FORBIDDEN);
    });

    it('RLS: Company B user cannot see Company A ledger entries or financial reports', async () => {
      const ledgerRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/accounting/ledger')
        .query({ accountCode: '1010' })
        .set('Authorization', `Bearer ${ctx.companyBToken}`);

      expect(ledgerRes.status).toBe(HttpStatus.OK);
      expect(ledgerRes.body.data.lines).toHaveLength(0);
      expect(ledgerRes.body.data.closingBalancePaisa).toBe('0');

      const tbRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/trial-balance')
        .query({ asOfDate: '2026-10-04' })
        .set('Authorization', `Bearer ${ctx.companyBToken}`);

      expect(tbRes.status).toBe(HttpStatus.OK);
      expect(tbRes.body.data.totalDebitPaisa).toBe('0');
      expect(tbRes.body.data.totalCreditPaisa).toBe('0');
    });
  });
});
