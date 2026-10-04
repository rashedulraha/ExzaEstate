import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { PeriodGuard } from '../../src/modules/accounting/period/period-guard.service.js';
import {
  type AccountingTestContext,
  setupAccountingTestContext,
} from './accounting-test.fixture.js';

describe('A6.2 — Fiscal Years & Periods (Period Close/Reopen)', () => {
  let ctx: AccountingTestContext;
  let periodGuard: PeriodGuard;

  beforeAll(async () => {
    ctx = await setupAccountingTestContext();
    periodGuard = ctx.app.get(PeriodGuard);
  });

  afterAll(async () => {
    if (ctx) await ctx.close();
  });

  it('S1: provisions fiscal year FY 2026-2027 and 12 periods from July to June', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/fiscal-years')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.success).toBe(true);

    const fiscalYears = res.body.data;
    expect(fiscalYears.length).toBeGreaterThanOrEqual(1);

    const currentFy = fiscalYears.find((fy: { name: string }) => fy.name.includes('2026-2027'));
    expect(currentFy).toBeDefined();
    expect(currentFy.periods).toHaveLength(12);

    // Period 1 is July, Period 7 is January, Period 12 is June
    expect(currentFy.periods[0].periodNumber).toBe(1);
    expect(currentFy.periods[0].name).toBe('July 2026');
    expect(currentFy.periods[0].status).toBe('Open');

    expect(currentFy.periods[6].periodNumber).toBe(7);
    expect(currentFy.periods[6].name).toBe('January 2027');
    expect(currentFy.periods[6].status).toBe('Open');

    expect(currentFy.periods[11].periodNumber).toBe(12);
    expect(currentFy.periods[11].name).toBe('June 2027');
    expect(currentFy.periods[11].status).toBe('Open');
  });

  it('S2: PeriodGuard.assertOpen succeeds for dates within an open period', async () => {
    const period = await periodGuard.assertOpen(ctx.companyAId, '2027-01-15');
    expect(period).toBeDefined();
    expect(period.name).toBe('January 2027');
    expect(period.status).toBe('Open');
  });

  it('S3: close period succeeds with period:close; subsequent PeriodGuard.assertOpen throws PERIOD_CLOSED (422)', async () => {
    // 1. Get January 2027 period ID
    const periodsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/periods')
      .set('Authorization', `Bearer ${ctx.accountantToken}`);

    expect(periodsRes.status).toBe(HttpStatus.OK);
    const janPeriod = periodsRes.body.data.find((p: { name: string }) => p.name === 'January 2027');
    expect(janPeriod).toBeDefined();

    // 2. Accountant closes January 2027 period
    const closeRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/periods/${janPeriod.id}/close`)
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send({ notes: 'Month-end closing complete' });

    expect(closeRes.status).toBe(HttpStatus.OK);
    expect(closeRes.body.success).toBe(true);
    expect(closeRes.body.data.status).toBe('Closed');
    expect(closeRes.body.data.closedById).toBe(ctx.accountantUserId);
    expect(closeRes.body.data.closedAt).toBeDefined();

    // 3. PeriodGuard.assertOpen for a date in January throws PERIOD_CLOSED (AT-10 requirement)
    await expect(periodGuard.assertOpen(ctx.companyAId, '2027-01-15')).rejects.toMatchObject({
      code: ERROR_CODES.PERIOD_CLOSED,
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  });

  it('S3: closing an already closed period returns 409 Conflict / INVALID_STATE_TRANSITION', async () => {
    const periodsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/periods')
      .set('Authorization', `Bearer ${ctx.accountantToken}`);

    const janPeriod = periodsRes.body.data.find((p: { name: string }) => p.name === 'January 2027');

    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/periods/${janPeriod.id}/close`)
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send();

    expect(res.status).toBe(HttpStatus.CONFLICT);
  });

  it('S3: reopening without reason is rejected by validation (400)', async () => {
    const periodsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/periods')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    const janPeriod = periodsRes.body.data.find((p: { name: string }) => p.name === 'January 2027');

    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/periods/${janPeriod.id}/reopen`)
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send({});

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('S3: non-MD user (Accountant lacking period:reopen) cannot reopen period (403 Forbidden)', async () => {
    const periodsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/periods')
      .set('Authorization', `Bearer ${ctx.accountantToken}`);

    const janPeriod = periodsRes.body.data.find((p: { name: string }) => p.name === 'January 2027');

    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/periods/${janPeriod.id}/reopen`)
      .set('Authorization', `Bearer ${ctx.accountantToken}`)
      .send({ reason: 'Accrual adjustment needed' });

    expect(res.status).toBe(HttpStatus.FORBIDDEN);
  });

  it('S3: MD reopens closed period with reason -> status Open, PeriodGuard.assertOpen succeeds again', async () => {
    const periodsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/periods')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    const janPeriod = periodsRes.body.data.find((p: { name: string }) => p.name === 'January 2027');

    const reopenReason = 'External auditor request for adjusting journal entries';
    const reopenRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/periods/${janPeriod.id}/reopen`)
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send({ reason: reopenReason });

    expect(reopenRes.status).toBe(HttpStatus.OK);
    expect(reopenRes.body.success).toBe(true);
    expect(reopenRes.body.data.status).toBe('Open');
    expect(reopenRes.body.data.reopenedById).toBe(ctx.mdUserId);
    expect(reopenRes.body.data.reopenReason).toBe(reopenReason);
    expect(reopenRes.body.data.reopenedAt).toBeDefined();

    // Now PeriodGuard.assertOpen succeeds again!
    const period = await periodGuard.assertOpen(ctx.companyAId, '2027-01-15');
    expect(period).toBeDefined();
    expect(period.status).toBe('Open');
  });

  it('S3: audit log records PERIOD_CLOSED and PERIOD_REOPENED actions', async () => {
    const logs = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
      tx.auditLog.findMany({
        where: {
          companyId: ctx.companyAId,
          action: { in: ['PERIOD_CLOSED', 'PERIOD_REOPENED'] },
        },
        orderBy: { createdAt: 'asc' },
      }),
    );

    expect(logs.length).toBeGreaterThanOrEqual(2);

    const closeLog = logs.find((l) => l.action === 'PERIOD_CLOSED');
    expect(closeLog).toBeDefined();
    expect(closeLog?.recordType).toBe('AccountingPeriod');

    const reopenLog = logs.find((l) => l.action === 'PERIOD_REOPENED');
    expect(reopenLog).toBeDefined();
    expect(reopenLog?.reason).toContain('External auditor request');
  });

  it('S3: locked period cannot be reopened via API (409 Conflict)', async () => {
    const periodsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/periods')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    const febPeriod = periodsRes.body.data.find(
      (p: { name: string }) => p.name === 'February 2027',
    );

    // 1. Close February period first
    await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/periods/${febPeriod.id}/close`)
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send();

    // 2. Lock February period
    const lockRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/periods/${febPeriod.id}/lock`)
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send();

    expect(lockRes.status).toBe(HttpStatus.OK);
    expect(lockRes.body.data.status).toBe('Locked');

    // 3. Attempting to reopen a Locked period returns 409 Conflict
    const reopenRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/periods/${febPeriod.id}/reopen`)
      .set('Authorization', `Bearer ${ctx.mdToken}`)
      .send({ reason: 'Emergency adjustment' });

    expect(reopenRes.status).toBe(HttpStatus.CONFLICT);
  });

  it('Multi-tenant isolation: Company B cannot view or modify Company A periods', async () => {
    const periodsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/accounting/periods')
      .set('Authorization', `Bearer ${ctx.mdToken}`);

    const companyAPeriodId = periodsRes.body.data[0].id;

    // Company B trying to fetch Company A's period by ID gets 404
    const getRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/accounting/periods/${companyAPeriodId}`)
      .set('Authorization', `Bearer ${ctx.companyBToken}`);

    expect(getRes.status).toBe(HttpStatus.NOT_FOUND);

    // Company B trying to close Company A's period gets 404
    const closeRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/accounting/periods/${companyAPeriodId}/close`)
      .set('Authorization', `Bearer ${ctx.companyBToken}`)
      .send();

    expect(closeRes.status).toBe(HttpStatus.NOT_FOUND);
  });
});
