import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { ApprovalsService } from '../../src/modules/approvals/approvals.service.js';
import { setupApprovalsTestContext, type ApprovalsTestContext } from './approvals-test.fixture.js';

describe('Approvals Core & Resume Engine (Task A4.4 - S1 & S2)', () => {
  let ctx: ApprovalsTestContext;
  let approvalsService: ApprovalsService;

  beforeAll(async () => {
    ctx = await setupApprovalsTestContext();
    approvalsService = ctx.app.get(ApprovalsService);
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('S1: Rules Retrieval & Creation', () => {
    it('MD can list provisioned approval rules for company', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/approvals/rules')
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(7);

      const discountRules = res.body.data.filter((r: { type: string }) => r.type === 'DISCOUNT');
      expect(discountRules.length).toBe(3); // Tier 1, Tier 2, Tier 3
    });

    it('MD can create a custom approval rule', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/approvals/rules')
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          type: 'PURCHASE_ORDER',
          name: 'Procurement PO Approval',
          requiredPermission: 'procurement:approve',
          stepOrder: 1,
          minAmountPaisa: '50000000', // ৳5,00,000
          maxAmountPaisa: '200000000', // ৳20,00,000
          isActive: true,
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('PURCHASE_ORDER');
      expect(res.body.data.stepOrder).toBe(1);
    });
  });

  describe('S1: approvalsService.request() Entry Point', () => {
    it('returns { required: false } when no rule matches (e.g. 0 amount)', async () => {
      const result = await approvalsService.request({
        companyId: ctx.companyAId,
        approvalType: 'DISCOUNT',
        amount: 0n,
        percentage: 0,
        requesterId: ctx.execUserId,
        entityType: 'Quotation',
        entityId: ctx.propertyAId,
      });

      expect(result.required).toBe(false);
    });

    it('throws ApprovalRequiredException (409) when threshold rule matches', async () => {
      let thrownError: unknown = null;
      try {
        await approvalsService.request({
          companyId: ctx.companyAId,
          approvalType: 'DISCOUNT',
          amount: 500_000_0n,
          percentage: 4.0, // Matches Tier 2 (2% < pct <= 5%)
          requesterId: ctx.execUserId,
          entityType: 'Quotation',
          entityId: ctx.propertyAId,
        });
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeDefined();
      expect((thrownError as { getStatus: () => number }).getStatus()).toBe(HttpStatus.CONFLICT);
      const resp = (
        thrownError as {
          getResponse: () => { code: string; details: { status: string; approvalId: string } };
        }
      ).getResponse();
      expect(resp.code).toBe(ERROR_CODES.APPROVAL_REQUIRED);
      expect(resp.details).toBeDefined();
      expect(resp.details.status).toBe('PENDING');
      expect(resp.details.approvalId).toBeDefined();

      // Check persisted in database
      const approval = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.approval.findUnique({
          where: { id: resp.details.approvalId },
          include: { steps: true },
        }),
      );

      expect(approval).toBeDefined();
      expect(approval?.status).toBe('PENDING');
      expect(approval?.steps.length).toBe(1);
      expect(approval?.steps[0]?.requiredPermission).toBe('discount:approve-tier2');
    });
  });

  describe('S2: Resume Callback Execution & Expiry', () => {
    it('completing approval triggers registered ApprovalHandler inside transaction', async () => {
      // 1. Create a quotation in company A
      let quotationId = '';
      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const quotation = await tx.quotation.create({
          data: {
            companyId: ctx.companyAId,
            propertyId: ctx.propertyAId,
            quotationNumber: 'QUO-APP-TEST-01',
            status: 'Draft',
            approvalStatus: 'PENDING',
            basePricePaisa: 10_000_000_0n,
            discountAmountPaisa: 400_000_0n, // 4% discount
            netPricePaisa: 9_600_000_0n,
            grandTotalPaisa: 9_600_000_0n,
            validUntil: new Date(Date.now() + 86400000),
            createdById: ctx.execUserId,
          },
        });
        quotationId = quotation.id;
      });

      // 2. Request approval for this quotation
      let approvalId = '';
      try {
        await approvalsService.request({
          companyId: ctx.companyAId,
          approvalType: 'DISCOUNT',
          amount: 400_000_0n,
          percentage: 4.0,
          requesterId: ctx.execUserId,
          entityType: 'Quotation',
          entityId: quotationId,
        });
      } catch (err: unknown) {
        approvalId = (
          err as { getResponse: () => { details: { approvalId: string } } }
        ).getResponse().details.approvalId;
      }

      expect(approvalId).toBeDefined();

      // 3. GM approves it via HTTP endpoint
      const approveRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/approvals/${approvalId}/approve`)
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .send({ comment: 'Approved 4% discount' })
        .expect(HttpStatus.OK);

      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.data.status).toBe('APPROVED');

      // 4. Assert quotation was resumed and updated by QuotationDiscountApprovalHandler
      const updatedQuotation = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.quotation.findUnique({ where: { id: quotationId } }),
      );

      expect(updatedQuotation?.status).toBe('Approved');
      expect(updatedQuotation?.approvalStatus).toBe('APPROVED');
    });

    it('checkExpiry marks overdue pending approvals as EXPIRED', async () => {
      // 1. Manually create an expired approval in database
      const expiredApprovalId = await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const approval = await tx.approval.create({
          data: {
            companyId: ctx.companyAId,
            approvalNumber: 'APP-2026-EXP01',
            type: 'DISCOUNT',
            title: 'Expired discount approval',
            payload: {},
            status: 'PENDING',
            amountPaisa: 300_000_0n,
            requesterId: ctx.execUserId,
            entityType: 'Quotation',
            entityId: ctx.propertyAId,
            expiresAt: new Date(Date.now() - 3600000), // 1 hour in the past
          },
        });
        return approval.id;
      });

      // 2. Trigger check-expiry endpoint
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/approvals/check-expiry')
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.expiredCount).toBeGreaterThanOrEqual(1);

      // 3. Verify status updated to EXPIRED
      const updated = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.approval.findUnique({ where: { id: expiredApprovalId } }),
      );
      expect(updated?.status).toBe('EXPIRED');
    });
  });
});
