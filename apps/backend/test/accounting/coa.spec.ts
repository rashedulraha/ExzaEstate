import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ACCOUNT_TYPES } from '@exzaestate/shared';
import { DefaultCoaStep } from '../../src/platform/tenant-provisioning/steps/default-coa.step.js';
import {
  type AccountingTestContext,
  setupAccountingTestContext,
} from './accounting-test.fixture.js';

describe('A6.1 — Chart of Accounts & Account Balances', () => {
  let ctx: AccountingTestContext;

  beforeAll(async () => {
    ctx = await setupAccountingTestContext();
  });

  afterAll(async () => {
    if (ctx) await ctx.close();
  });

  it('S1 & S2: provisions all 34 default accounts including 1900 Suspense and 2600 Unearned Revenue', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/coa')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.success).toBe(true);

    const accounts = res.body.data;
    expect(accounts.length).toBeGreaterThanOrEqual(34);

    const suspense = accounts.find((a: { code: string }) => a.code === '1900');
    expect(suspense).toBeDefined();
    expect(suspense.name).toContain('Suspense');
    expect(suspense.type).toBe(ACCOUNT_TYPES.LIABILITY);
    expect(suspense.isSystem).toBe(true);

    const unearned = accounts.find((a: { code: string }) => a.code === '2600');
    expect(unearned).toBeDefined();
    expect(unearned.name).toContain('Unearned Sales Revenue');
    expect(unearned.type).toBe(ACCOUNT_TYPES.LIABILITY);
    expect(unearned.isSystem).toBe(true);

    const salesRev = accounts.find((a: { code: string }) => a.code === '4100');
    expect(salesRev).toBeDefined();
    expect(salesRev.type).toBe(ACCOUNT_TYPES.INCOME);
    expect(salesRev.isSystem).toBe(true);
  });

  it('Acceptance: provisioning twice creates no duplicate accounts (idempotent)', async () => {
    const beforeCount = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.account.count({ where: { companyId: ctx.companyAId } }),
    );

    // Run tenant provisioning step a second time
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const coaStep = ctx.app.get(DefaultCoaStep);
      await coaStep.execute(
        {
          companyId: ctx.companyAId,
          companyName: 'Company A',
          companyCode: 'ACTA',
          timezone: 'Asia/Dhaka',
          managingDirector: { email: 'md@test.com', fullName: 'MD' },
          state: new Map<string, unknown>(),
        },
        tx as unknown as Prisma.TransactionClient,
      );
    });

    const afterCount = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.account.count({ where: { companyId: ctx.companyAId } }),
    );

    expect(afterCount).toBe(beforeCount);
  });

  it('Acceptance: account codes and names are editable without a deploy', async () => {
    const resList = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/coa')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    const cashAcc = resList.body.data.find((a: { code: string }) => a.code === '1010');
    expect(cashAcc).toBeDefined();

    const resUpdate = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/accounting/coa/${cashAcc.id}`)
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send({
        name: 'Petty Cash in Hand (HQ)',
        description: 'Updated description without deploy',
      });

    expect(resUpdate.status).toBe(HttpStatus.OK);
    expect(resUpdate.body.data.name).toBe('Petty Cash in Hand (HQ)');
    expect(resUpdate.body.data.description).toBe('Updated description without deploy');
  });

  it('Acceptance: system accounts cannot be deactivated while mapped (returns 409 Conflict)', async () => {
    const resList = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/coa')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    const receivable = resList.body.data.find((a: { code: string }) => a.code === '1100');
    expect(receivable.isSystem).toBe(true);

    const resDeactivate = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/accounting/coa/${receivable.id}`)
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send({ isActive: false });

    expect(resDeactivate.status).toBe(HttpStatus.CONFLICT);
    expect(resDeactivate.body.error.message).toContain('System accounts cannot be deactivated');
  });

  it('allows creating and deactivating a custom non-system account', async () => {
    const resList = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/coa')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    const bankGroup = resList.body.data.find((a: { code: string }) => a.code === '1020');

    const createRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/accounting/coa')
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send({
        code: '1025',
        name: 'BRAC Bank Escrow Account',
        type: ACCOUNT_TYPES.ASSET,
        parentId: bankGroup.id,
        isGroup: false,
        description: 'Project escrow account',
      });

    expect(createRes.status).toBe(HttpStatus.CREATED);
    const customId = createRes.body.data.id;
    expect(createRes.body.data.isSystem).toBe(false);

    // Deactivate custom account
    const deactRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/accounting/coa/${customId}`)
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send({ isActive: false });

    expect(deactRes.status).toBe(HttpStatus.OK);
    expect(deactRes.body.data.isActive).toBe(false);
  });

  it('rejects creating duplicate account code within the same company', async () => {
    const dupRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/accounting/coa')
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send({
        code: '1010',
        name: 'Duplicate Cash',
        type: ACCOUNT_TYPES.ASSET,
      });

    expect(dupRes.status).toBe(HttpStatus.CONFLICT);
  });

  it('S3: account-balance read query returns contract with empty-state 0 balance', async () => {
    const resList = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/coa')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    const firstAcc = resList.body.data[0];

    const balRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/accounting/coa/${firstAcc.id}/balance`)
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    expect(balRes.status).toBe(HttpStatus.OK);
    expect(balRes.body.success).toBe(true);
    expect(balRes.body.data.accountId).toBe(firstAcc.id);
    expect(balRes.body.data.code).toBe(firstAcc.code);
    expect(balRes.body.data.balancePaisa).toBe('0');
    expect(balRes.body.data.formattedBalance).toBe('BDT 0.00');
  });

  it('supports filtering accounts by type and search keyword', async () => {
    const resAsset = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/coa?type=ASSET')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    expect(resAsset.status).toBe(HttpStatus.OK);
    expect(resAsset.body.data.every((a: { type: string }) => a.type === ACCOUNT_TYPES.ASSET)).toBe(
      true,
    );

    const resSearch = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/coa?search=Bank')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    expect(resSearch.status).toBe(HttpStatus.OK);
    expect(resSearch.body.data.some((a: { name: string }) => a.name.includes('Bank'))).toBe(true);
  });

  it('enforces multi-tenant isolation: Company B cannot view or modify Company A accounts', async () => {
    const resListA = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/coa')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    const accA = resListA.body.data[0];

    // Company B tries to view Company A's account by ID
    const resCrossView = await request(ctx.app.getHttpServer())
      .get(`/api/v1/accounting/coa/${accA.id}`)
      .set('Authorization', `Bearer ${ctx.companyBToken}`);

    expect(resCrossView.status).toBe(HttpStatus.NOT_FOUND);

    // Company B tries to modify Company A's account
    const resCrossEdit = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/accounting/coa/${accA.id}`)
      .set('Authorization', `Bearer ${ctx.companyBToken}`)
      .send({ name: 'Hacked Name' });

    expect(resCrossEdit.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const unauthRes = await request(ctx.app.getHttpServer()).get('/api/v1/accounting/coa');

    expect(unauthRes.status).toBe(HttpStatus.UNAUTHORIZED);
  });
});
