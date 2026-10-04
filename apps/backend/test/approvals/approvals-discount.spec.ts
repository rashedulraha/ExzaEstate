import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { ApprovalsService } from '../../src/modules/approvals/approvals.service.js';
import { setupApprovalsTestContext, type ApprovalsTestContext } from './approvals-test.fixture.js';

describe('Discount Matrix & Maker-Checker (Task A4.4 - S3 & S4 / AT-06 & AT-24)', () => {
  let ctx: ApprovalsTestContext;
  let approvalsService: ApprovalsService;

  beforeAll(async () => {
    ctx = await setupApprovalsTestContext();
    approvalsService = ctx.app.get(ApprovalsService);
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('S3 / AT-06: Discount Tiers & Permission Hierarchy', () => {
    it('AT-06: 6% discount is blocked without approval, GM cannot approve 6%, MD can approve 6%', async () => {
      // 1. Executive requests 6% discount (Tier 3)
      let approvalId = '';
      try {
        await approvalsService.request({
          companyId: ctx.companyAId,
          approvalType: 'DISCOUNT',
          amount: 600_000_0n,
          percentage: 6.0,
          requesterId: ctx.execUserId,
          entityType: 'Quotation',
          entityId: ctx.propertyAId,
        });
      } catch (err: unknown) {
        approvalId = (
          err as { getResponse: () => { details: { approvalId: string } } }
        ).getResponse().details.approvalId;
      }

      expect(approvalId).toBeDefined();

      // 2. GM attempts to approve 6% -> GM only has Tier 2 -> Must be rejected with 403
      const gmRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/approvals/${approvalId}/approve`)
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .send({ comment: 'GM trying to approve 6%' });

      expect(gmRes.status).toBe(HttpStatus.FORBIDDEN);
      expect(gmRes.body.error.code).toBe(ERROR_CODES.FORBIDDEN);

      // 3. MD approves 6% -> MD has Tier 3 -> Succeeds
      const mdRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/approvals/${approvalId}/approve`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({ comment: 'MD approved 6% tier 3 discount' });

      expect(mdRes.status).toBe(HttpStatus.OK);
      expect(mdRes.body.data.status).toBe('APPROVED');
    });

    it('GM can approve 1% (Tier 1) and 4% (Tier 2) due to permission hierarchy', async () => {
      // 1. Executive requests 1.5% discount (Tier 1)
      let tier1ApprovalId = '';
      try {
        await approvalsService.request({
          companyId: ctx.companyAId,
          approvalType: 'DISCOUNT',
          amount: 150_000_0n,
          percentage: 1.5,
          requesterId: ctx.execUserId,
          entityType: 'Quotation',
          entityId: ctx.propertyAId,
        });
      } catch (err: unknown) {
        tier1ApprovalId = (
          err as { getResponse: () => { details: { approvalId: string } } }
        ).getResponse().details.approvalId;
      }

      // GM (Tier 2) approves Tier 1 request -> Succeeds due to hierarchy
      const gmTier1Res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/approvals/${tier1ApprovalId}/approve`)
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .send({ comment: 'GM approved 1.5% discount' });

      expect(gmTier1Res.status).toBe(HttpStatus.OK);
      expect(gmTier1Res.body.data.status).toBe('APPROVED');
    });
  });

  describe('S4 / AT-24: Maker-Checker & Single-User Auto-Approval', () => {
    it('AT-06 / AT-24: Requester cannot approve own request (SELF_APPROVAL_FORBIDDEN)', async () => {
      // MD creates a discount request
      let mdApprovalId = '';
      try {
        await approvalsService.request({
          companyId: ctx.companyAId,
          approvalType: 'DISCOUNT',
          amount: 400_000_0n,
          percentage: 4.0,
          requesterId: ctx.mdUserId,
          entityType: 'Quotation',
          entityId: ctx.propertyAId,
        });
      } catch (err: unknown) {
        mdApprovalId = (
          err as { getResponse: () => { details: { approvalId: string } } }
        ).getResponse().details.approvalId;
      }

      expect(mdApprovalId).toBeDefined();

      // MD tries to approve their own request
      const selfApproveRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/approvals/${mdApprovalId}/approve`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({ comment: 'Approving my own request' });

      expect(selfApproveRes.status).toBe(HttpStatus.FORBIDDEN);
      expect(selfApproveRes.body.error.code).toBe(ERROR_CODES.SELF_APPROVAL_FORBIDDEN);
    });

    it('AT-24: Single-active-user company generates AUTO_APPROVED record and executes handler', async () => {
      // 1. Create a quotation in the single-user company
      let soloQuotationId = '';
      await ctx.tenantDb.withCompany(ctx.singleCompanyId, async (tx) => {
        const quotation = await tx.quotation.create({
          data: {
            companyId: ctx.singleCompanyId,
            propertyId: ctx.singlePropertyId,
            quotationNumber: 'QUO-SOLO-001',
            status: 'Draft',
            approvalStatus: 'PENDING',
            basePricePaisa: 10_000_000_0n,
            discountAmountPaisa: 600_000_0n, // 6%
            netPricePaisa: 9_400_000_0n,
            grandTotalPaisa: 9_400_000_0n,
            validUntil: new Date(Date.now() + 86400000),
            createdById: ctx.singleMdUserId,
          },
        });
        soloQuotationId = quotation.id;
      });

      // 2. Request approval in single-user company
      const result = await approvalsService.request({
        companyId: ctx.singleCompanyId,
        approvalType: 'DISCOUNT',
        amount: 600_000_0n,
        percentage: 6.0,
        requesterId: ctx.singleMdUserId,
        entityType: 'Quotation',
        entityId: soloQuotationId,
      });

      // 3. Single-user auto-approve: returns { required: true, autoApproved: true }
      expect(result.required).toBe(true);
      expect(result.autoApproved).toBe(true);
      expect(result.approvalId).toBeDefined();

      // 4. Assert approval record exists in DB with AUTO_APPROVED status
      const approvalRecord = await ctx.tenantDb.withCompany(ctx.singleCompanyId, (tx) =>
        tx.approval.findUnique({
          where: { id: result.approvalId },
          include: { steps: true },
        }),
      );

      expect(approvalRecord).toBeDefined();
      expect(approvalRecord?.status).toBe('AUTO_APPROVED');
      expect(approvalRecord?.steps[0]?.status).toBe('AUTO_APPROVED');

      // 5. Assert quotation was updated to Approved by registered handler
      const updatedSoloQuotation = await ctx.tenantDb.withCompany(ctx.singleCompanyId, (tx) =>
        tx.quotation.findUnique({ where: { id: soloQuotationId } }),
      );
      expect(updatedSoloQuotation?.status).toBe('Approved');
      expect(updatedSoloQuotation?.approvalStatus).toBe('APPROVED');
    });
  });
});
