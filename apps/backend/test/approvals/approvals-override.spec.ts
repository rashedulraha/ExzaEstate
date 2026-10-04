import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { ApprovalsService } from '../../src/modules/approvals/approvals.service.js';
import { setupApprovalsTestContext, type ApprovalsTestContext } from './approvals-test.fixture.js';

describe('Joint Control Override & Approval Inbox (Task A4.4 - S5)', () => {
  let ctx: ApprovalsTestContext;
  let approvalsService: ApprovalsService;

  beforeAll(async () => {
    ctx = await setupApprovalsTestContext();
    approvalsService = ctx.app.get(ApprovalsService);
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('S5: Joint Control for approval:override (MD + GM)', () => {
    it('requires two distinct users holding approval:override; single user cannot complete override alone', async () => {
      // 1. Executive requests 10% discount (Tier 3)
      let approvalId = '';
      try {
        await approvalsService.request({
          companyId: ctx.companyAId,
          approvalType: 'DISCOUNT',
          amount: 1_000_000_0n,
          percentage: 10.0,
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

      // 2. Executive without approval:override attempts override -> 403 Forbidden
      const execOverrideRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/approvals/${approvalId}/override`)
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({ overrideReason: 'Executive trying to override' });

      expect(execOverrideRes.status).toBe(HttpStatus.FORBIDDEN);

      // 3. User 1 (MD) initiates override -> Step 1
      const mdOverrideRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/approvals/${approvalId}/override`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({ overrideReason: 'VIP commercial override approved by MD' });

      expect(mdOverrideRes.status).toBe(HttpStatus.OK);
      expect(mdOverrideRes.body.data.status).toBe('OVERRIDE_PENDING_SECOND_USER');

      // 4. Same User (MD) attempts to complete the override -> Forbidden
      const mdSecondOverrideRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/approvals/${approvalId}/override`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({ overrideReason: 'MD trying to complete override alone' });

      expect(mdSecondOverrideRes.status).toBe(HttpStatus.FORBIDDEN);
      expect(mdSecondOverrideRes.body.error.code).toBe(ERROR_CODES.SELF_APPROVAL_FORBIDDEN);

      // 5. User 2 (GM) completes the override -> Step 2
      const gmOverrideRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/approvals/${approvalId}/override`)
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .send({ overrideReason: 'Joint override confirmed by GM' });

      expect(gmOverrideRes.status).toBe(HttpStatus.OK);
      expect(gmOverrideRes.body.data.status).toBe('OVERRIDDEN');
    });
  });

  describe('S5: Inbox & Sent Endpoints', () => {
    it('Executive can view sent requests; GM and MD can view pending inbox', async () => {
      // 1. Executive sends a 3% discount request
      let sentApprovalId = '';
      try {
        await approvalsService.request({
          companyId: ctx.companyAId,
          approvalType: 'DISCOUNT',
          amount: 300_000_0n,
          percentage: 3.0, // Tier 2
          requesterId: ctx.execUserId,
          entityType: 'Quotation',
          entityId: ctx.propertyAId,
        });
      } catch (err: unknown) {
        sentApprovalId = (
          err as { getResponse: () => { details: { approvalId: string } } }
        ).getResponse().details.approvalId;
      }

      // 2. Executive checks GET /approvals/sent
      const sentRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/approvals/sent')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.OK);

      expect(sentRes.body.success).toBe(true);
      const mySent = sentRes.body.data.items.find(
        (item: { id: string }) => item.id === sentApprovalId,
      );
      expect(mySent).toBeDefined();

      // 3. GM checks GET /approvals/inbox -> GM has Tier 2 -> request appears
      const gmInboxRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/approvals/inbox')
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .expect(HttpStatus.OK);

      expect(gmInboxRes.body.success).toBe(true);
      const gmItem = gmInboxRes.body.data.items.find(
        (item: { id: string }) => item.id === sentApprovalId,
      );
      expect(gmItem).toBeDefined();

      // 4. Executive checks GET /approvals/inbox -> Executive cannot approve -> not in inbox
      const execInboxRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/approvals/inbox')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.OK);

      const execItem = execInboxRes.body.data.items.find(
        (item: { id: string }) => item.id === sentApprovalId,
      );
      expect(execItem).toBeUndefined();

      // 5. GET /approvals/:id details check
      const detailRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/approvals/${sentApprovalId}`)
        .set('Authorization', `Bearer ${ctx.gmToken}`)
        .expect(HttpStatus.OK);

      expect(detailRes.body.success).toBe(true);
      expect(detailRes.body.data.id).toBe(sentApprovalId);
      expect(detailRes.body.data.steps.length).toBeGreaterThan(0);
    });
  });
});
