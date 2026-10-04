import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type AccountingTestContext,
  setupAccountingTestContext,
} from './accounting-test.fixture.js';

interface BankAccountRecord {
  id: string;
  name: string;
  accountType: string;
  accountNumberMasked: string | null;
  coaAccountCode: string;
  currentBalancePaisa: string;
}

interface TransferRecord {
  id: string;
  transferNumber: string;
  amountPaisa: string;
  journalId: string;
}

interface ReconRecord {
  id: string;
  status: string;
  statementBalancePaisa: string;
  reconciledBalancePaisa: string;
  differencePaisa: string;
}

describe('A6.5 — Cash & Bank Accounts, Transfers & Reconciliation', () => {
  let ctx: AccountingTestContext;
  let bankAccountId: string;
  let cashAccountId: string;
  let postedTransferJournalId: string;
  let transferJournalLineId: string;

  beforeAll(async () => {
    ctx = await setupAccountingTestContext();
  });

  afterAll(async () => {
    if (ctx) await ctx.close();
  });

  describe('S1: Bank, Cash & Wallet Accounts Creation & Encryption', () => {
    it('S1: lists global reference banks and branches', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/accounting/cashbank/banks')
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      const banks = (res.body.data ?? res.body) as Array<{ code: string; branches: unknown[] }>;
      expect(banks.length).toBeGreaterThanOrEqual(5);
      const dbbl = banks.find((b) => b.code === 'DBBL');
      expect(dbbl).toBeDefined();
      expect(dbbl!.branches.length).toBeGreaterThanOrEqual(1);
    });

    it('S1: creates Bank account with initial balance ৳10,00,000, auto-generates 1020-01, encrypts number', async () => {
      const plainAccountNumber = '10711000998877';
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/accounting/cashbank/accounts')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({
          accountType: 'BANK',
          name: 'DBBL Corporate Principal Account',
          accountNumber: plainAccountNumber,
          routingNumber: '090261623',
          swiftCode: 'DBBLBDDH',
          initialBalancePaisa: '100000000', // ৳10,00,000 opening capital
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      const account = (res.body.data ?? res.body) as BankAccountRecord;
      bankAccountId = account.id;

      expect(account.coaAccountCode).toBe('1020-01');
      expect(account.accountNumberMasked).toBe('••••••••••8877');
      expect(account.currentBalancePaisa).toBe('100000000');

      // Verify DB level encryption at rest (enc:v1: header)
      const dbRow = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.bankAccount.findUnique({ where: { id: bankAccountId } }),
      );
      expect(dbRow!.accountNumberEnc).toMatch(/^enc:v1:/);
      expect(dbRow!.accountNumberEnc).not.toContain(plainAccountNumber);
      expect(dbRow!.accountNumberBidx).toBeDefined();
    });

    it('S1: creates Cash account linked to COA 1010 Cash in Hand', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/accounting/cashbank/accounts')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({
          accountType: 'CASH',
          name: 'Main Office Cash Drawer',
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      const account = (res.body.data ?? res.body) as BankAccountRecord;
      cashAccountId = account.id;
      expect(account.coaAccountCode).toBe('1010');
    });

    it('S1: creates Wallet account under 1030 Mobile Wallets', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/accounting/cashbank/accounts')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({
          accountType: 'WALLET',
          name: 'bKash Corporate Merchant',
          accountNumber: '01700000001',
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      const account = (res.body.data ?? res.body) as BankAccountRecord;
      expect(account.coaAccountCode).toBe('1030-01');
    });
  });

  describe('S2: CASH_TRANSFER Balanced Orchestration', () => {
    it('S2: transfers ৳5,00,000 from Bank to Cash via PostingService', async () => {
      const transferAmount = '50000000'; // ৳5,00,000

      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/accounting/cashbank/transfers')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({
          sourceBankAccountId: bankAccountId,
          destinationBankAccountId: cashAccountId,
          amountPaisa: transferAmount,
          transferDate: '2026-10-04',
          referenceNumber: 'CHQ-778899',
          narration: 'Withdraw cash from DBBL for petty cash',
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      const transfer = (res.body.data ?? res.body) as TransferRecord;
      expect(transfer.transferNumber).toMatch(/^TRF-2026-\d{4}$/);
      expect(transfer.amountPaisa).toBe(transferAmount);
      postedTransferJournalId = transfer.journalId;

      // Verify balanced double-entry journal lines
      const journalRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/accounting/journals/${postedTransferJournalId}`)
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      const journal = journalRes.body.data ?? journalRes.body;
      expect(journal.status).toBe('Posted');
      expect(journal.lines).toHaveLength(2);

      const drCash = journal.lines.find((l: { accountCode: string }) => l.accountCode === '1010');
      const crBank = journal.lines.find(
        (l: { accountCode: string }) => l.accountCode === '1020-01',
      );
      expect(drCash.debitPaisa).toBe(transferAmount);
      expect(crBank.creditPaisa).toBe(transferAmount);
      transferJournalLineId = crBank.id;

      // Verify dynamic balances updated
      const accountsRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/accounting/cashbank/accounts')
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      const accounts = (accountsRes.body.data ?? accountsRes.body) as BankAccountRecord[];
      const bank = accounts.find((a) => a.id === bankAccountId);
      const cash = accounts.find((a) => a.id === cashAccountId);
      expect(bank!.currentBalancePaisa).toBe('50000000'); // ৳10,00,000 - ৳5,00,000 = ৳5,00,000
      expect(cash!.currentBalancePaisa).toBe('50000000'); // ৳5,00,000
    });

    it('S2: rejects transfer if source and destination accounts are identical', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/accounting/cashbank/transfers')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({
          sourceBankAccountId: bankAccountId,
          destinationBankAccountId: bankAccountId,
          amountPaisa: '1000000',
          transferDate: '2026-10-04',
        });

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      const message = res.body.error?.message ?? res.body.message;
      expect(message).toContain('must be different');
    });
  });

  describe('S3: Manual Bank Reconciliation Tick-off & Immutability', () => {
    let reconId: string;

    it('S3: creates draft reconciliation session with statement balance', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/accounting/cashbank/reconciliations')
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({
          bankAccountId,
          statementDate: '2026-10-04',
          statementBalancePaisa: '50000000', // Matches bank ledger ৳5,00,000
          notes: 'October 2026 Reconciliation',
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      const recon = (res.body.data ?? res.body) as ReconRecord;
      reconId = recon.id;
      expect(recon.status).toBe('Draft');
      expect(recon.statementBalancePaisa).toBe('50000000');
    });

    it('S3: gets unreconciled journal lines for bank account', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/accounting/cashbank/reconciliations/${reconId}/unreconciled-lines`)
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      const lines = (res.body.data ?? res.body) as Array<{ journalLineId: string }>;
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines.some((l) => l.journalLineId === transferJournalLineId)).toBe(true);
    });

    it('S3: matches cleared lines and completes reconciliation without mutating journals', async () => {
      const unreconciledRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/accounting/cashbank/reconciliations/${reconId}/unreconciled-lines`)
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      const lines = (unreconciledRes.body.data ?? unreconciledRes.body) as Array<{
        journalLineId: string;
      }>;

      const matchRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/accounting/cashbank/reconciliations/${reconId}/match`)
        .set('Authorization', `Bearer ${ctx.accountantToken}`)
        .send({
          items: lines.map((l) => ({
            journalLineId: l.journalLineId,
            clearedDate: '2026-10-04',
            isCleared: true,
          })),
        });

      expect(matchRes.status).toBe(HttpStatus.OK);
      const matched = (matchRes.body.data ?? matchRes.body) as ReconRecord;
      expect(matched.differencePaisa).toBe('0');

      const completeRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/accounting/cashbank/reconciliations/${reconId}/complete`)
        .set('Authorization', `Bearer ${ctx.accountantToken}`);

      expect(completeRes.status).toBe(HttpStatus.OK);
      const completed = (completeRes.body.data ?? completeRes.body) as ReconRecord;
      expect(completed.status).toBe('Completed');

      // Verify immutable journals were NOT mutated
      const journalRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/accounting/journals/${postedTransferJournalId}`)
        .set('Authorization', `Bearer ${ctx.accountantToken}`);
      expect(journalRes.body.data.status).toBe('Posted');
    });

    it('S3: verifies multi-tenant isolation (Tenant B cannot view Tenant A accounts)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/accounting/cashbank/accounts/${bankAccountId}`)
        .set('Authorization', `Bearer ${ctx.companyBToken}`);

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });
  });
});
