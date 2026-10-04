import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES, formatMoney } from '@exzaestate/shared';
import { setupSalesTestContext, type SalesTestContext } from './sales-test.fixture.js';

describe('Sales Quotations & Branded PDF Generation (Task A4.3)', () => {
  let ctx: SalesTestContext;
  let propertyAId: string;
  let customerAId: string;
  let chargeTypeUtilityId: string;
  let chargeTypeRegId: string;
  let createdQuotationId: string;
  let pendingQuotationId: string;

  beforeAll(async () => {
    ctx = await setupSalesTestContext();

    // Seed test fixtures in Company A: property, customer, charge types
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      // 1. Project & Property
      const land = await tx.land.create({
        data: {
          companyId: ctx.companyAId,
          code: 'LND-QTEST',
          name: 'Quotation Test Land',
          district: 'Dhaka',
          upazila: 'Gulshan',
          mouza: 'Tejgaon',
          areaSqft: 7200.0,
          status: 'ACTIVE',
        },
      });

      const project = await tx.project.create({
        data: {
          companyId: ctx.companyAId,
          landId: land.id,
          code: 'PRJ-QTEST',
          name: 'Quotation Test Heights',
          type: 'RESIDENTIAL',
          status: 'PLANNING',
        },
      });

      const property = await tx.property.create({
        data: {
          companyId: ctx.companyAId,
          projectId: project.id,
          code: 'UNIT-Q-101',
          title: '3BHK Luxury Suite 101',
          type: 'FLAT',
          status: 'Available',
          areaSqft: 1850.0,
          facing: 'SOUTH_EAST',
          basePricePaisa: 120_000_000_0n, // ৳1,20,00,000 (1.2 Crore)
          premiumPaisa: 5_000_000_0n, // ৳5,00,000
          netPricePaisa: 125_000_000_0n,
        },
      });
      propertyAId = property.id;

      // 2. Customer
      const customer = await tx.customer.create({
        data: {
          companyId: ctx.companyAId,
          customerNumber: 'CUST-Q-001',
          name: 'Rafiqul Islam',
          phone: '+8801811223344',
          email: 'rafiqul@example.com',
        },
      });
      customerAId = customer.id;

      // 3. Charge types
      const utility = await tx.chargeType.create({
        data: {
          companyId: ctx.companyAId,
          code: 'UTILITY_QUO',
          name: 'Utility Connection Fees',
          calculationType: 'FIXED',
          defaultAmountPaisa: 15_000_000n, // ৳1,50,000
          vatRatePct: 5.0,
          payableStage: 'AT_HANDOVER',
          isActive: true,
        },
      });
      chargeTypeUtilityId = utility.id;

      const reg = await tx.chargeType.create({
        data: {
          companyId: ctx.companyAId,
          code: 'REG_QUO',
          name: 'Registration & Stamp Duty',
          calculationType: 'PERCENTAGE',
          defaultRatePct: 8.0,
          vatRatePct: 0.0,
          payableStage: 'AT_HANDOVER',
          isActive: true,
        },
      });
      chargeTypeRegId = reg.id;
    });
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.close();
    }
  });

  describe('S1 & S2: Quotation Creation & Acceptance Non-Reservation Rule', () => {
    it('creates a standard quotation without reserving the property (property status remains Available)', async () => {
      // Net price before charges:
      // Base: ৳1,20,00,000 + Premium: ৳5,00,000 = ৳1,25,00,000 (12,500,000,00 paisa)
      // Charges:
      // 1. Utility: ৳1,50,000 + 5% VAT (৳7,500) = ৳1,57,500
      // 2. Registration: 8% of ৳1,25,00,000 = ৳10,00,000 (0% VAT)
      // Total Additional: ৳11,50,000, Total VAT: ৳7,500
      // Grand Total: ৳1,25,00,000 + ৳11,50,000 + ৳7,500 = ৳1,36,57,500
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/quotations')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId: propertyAId,
          customerId: customerAId,
          validDays: 15,
          charges: [{ chargeTypeId: chargeTypeUtilityId }, { chargeTypeId: chargeTypeRegId }],
          installmentCount: 24,
          firstDueDate: '2026-05-01',
          notes: 'Standard quotation for Rafiqul Islam.',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.id).toBeDefined();
      expect(data.quotationNumber).toMatch(/^QUO-\d{4}-\d{5}$/);
      expect(data.status).toBe('Draft');
      expect(data.isExpired).toBe(false);

      // Financial breakdown:
      expect(data.basePricePaisa).toBe('1200000000');
      expect(data.basePriceFormatted).toBe(formatMoney(1200000000n));
      expect(data.premiumAmountPaisa).toBe('50000000');
      expect(data.discountAmountPaisa).toBe('0');
      expect(data.netPricePaisa).toBe('1250000000');
      expect(data.totalAdditionalChargesPaisa).toBe('115000000');
      expect(data.totalVatPaisa).toBe('750000');
      expect(data.grandTotalPaisa).toBe('1365750000');
      expect(data.grandTotalFormatted).toBe('৳1,36,57,500.00');

      // Schedule snapshots:
      expect(data.chargesSnapshot).toHaveLength(2);
      expect(data.installmentsSnapshot).toHaveLength(25); // 1 booking amount + 24 installments

      createdQuotationId = data.id;

      // CRITICAL ACCEPTANCE CHECK: A quotation never reserves a property!
      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const prop = await tx.property.findUniqueOrThrow({
          where: { id: propertyAId },
        });
        expect(prop.status).toBe('Available');
      });
    });

    it('requires approval when discount is applied (> 0% free allowance)', async () => {
      // 5% discount on ৳1,25,00,000 = ৳6,25,000 (62,500,000 paisa)
      // Net price: ৳1,18,75,000 (1,187,500,000 paisa)
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/quotations')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId: propertyAId,
          customerId: customerAId,
          discountPct: 5.0,
          validDays: 10,
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.requiresApproval).toBe(true);
      expect(data.status).toBe('Pending Approval');
      expect(data.approvalStatus).toBe('PENDING');
      expect(data.discountPct).toBe(5);
      expect(data.discountAmountPaisa).toBe('62500000');
      expect(data.netPricePaisa).toBe('1187500000');

      pendingQuotationId = data.id;
    });
  });

  describe('Lifecycle: Approval, Rejection & Sending', () => {
    it('approves a pending quotation as MD', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/sales/quotations/${pendingQuotationId}/approve`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Approved');
      expect(res.body.data.approvalStatus).toBe('APPROVED');
      expect(res.body.data.approvedById).toBe(ctx.mdUserId);
      expect(res.body.data.approvedAt).toBeDefined();
    });

    it('marks quotation as Sent', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/sales/quotations/${createdQuotationId}/send`)
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Sent');
    });

    it('rejects a quotation with reason as MD', async () => {
      // Create another quotation to reject
      const createRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/quotations')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          propertyId: propertyAId,
          customerId: customerAId,
          discountPct: 8.0,
        })
        .expect(HttpStatus.CREATED);

      const rejectId = createRes.body.data.id;

      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/sales/quotations/${rejectId}/reject`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({ reason: 'Discount exceeds authorized limit for Q1' })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Rejected');
      expect(res.body.data.approvalStatus).toBe('REJECTED');
      expect(res.body.data.rejectionReason).toContain('exceeds authorized limit');
    });
  });

  describe('S3: Branded PDF Generation via PdfRenderer Port', () => {
    it('generates institutional branded PDF with ৳ and formatted amounts', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/quotations/${createdQuotationId}/pdf`)
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.OK);

      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain(
        `inline; filename="Quotation-${createdQuotationId}.pdf"`,
      );
      expect(res.body).toBeDefined();
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(50);
      expect(res.body.toString('utf-8', 0, 8)).toContain('%PDF-');
    });
  });

  describe('S4: Quotation Expiry Job & Conversion Guard', () => {
    it('marks expired quotations as Expired and rejects sending/approving them', async () => {
      // Seed a quotation with an expired validUntil date
      let expiredQuotationId: string;
      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day in the past
        const q = await tx.quotation.create({
          data: {
            companyId: ctx.companyAId,
            quotationNumber: 'QUO-EXP-00001',
            status: 'Draft',
            propertyId: propertyAId,
            validUntil: pastDate,
            basePricePaisa: 100_000_000_0n,
            netPricePaisa: 100_000_000_0n,
            grandTotalPaisa: 100_000_000_0n,
          },
        });
        expiredQuotationId = q.id;
      });

      // Trigger expiry check
      const expiryRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/quotations/check-expiry')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.OK);

      expect(expiryRes.body.success).toBe(true);
      expect(expiryRes.body.data.expiredCount).toBeGreaterThanOrEqual(1);

      // Verify quotation status is now Expired
      const getRes = await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/quotations/${expiredQuotationId!}`)
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.OK);

      expect(getRes.body.data.status).toBe('Expired');
      expect(getRes.body.data.isExpired).toBe(true);

      // Attempting to send expired quotation fails
      const sendRes = await request(ctx.app.getHttpServer())
        .post(`/api/v1/sales/quotations/${expiredQuotationId!}/send`)
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.BAD_REQUEST);

      expect(sendRes.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(sendRes.body.error.message).toContain('expired');
    });
  });

  describe('Multi-Tenancy & RLS Isolation', () => {
    it('prevents Company B from reading or accessing Company A quotations', async () => {
      // Company B tries to fetch Company A's quotation
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/quotations/${createdQuotationId}`)
        .set('Authorization', `Bearer ${ctx.companyBToken}`)
        .expect(HttpStatus.NOT_FOUND);

      // Company B tries to download Company A's quotation PDF
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/quotations/${createdQuotationId}/pdf`)
        .set('Authorization', `Bearer ${ctx.companyBToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
