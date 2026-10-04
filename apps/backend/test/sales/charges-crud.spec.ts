import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { setupSalesTestContext, type SalesTestContext } from './sales-test.fixture.js';

describe('Sales Charge Types & Calculation Engine (Task A4.2)', () => {
  let ctx: SalesTestContext;
  let createdChargeTypeId: string;
  let seededUtilityId: string;

  beforeAll(async () => {
    ctx = await setupSalesTestContext();

    // Seed standard charge types for Company A
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const utility = await tx.chargeType.create({
        data: {
          companyId: ctx.companyAId,
          code: 'UTILITY_DEMO',
          name: 'Utility Connection Fee',
          description: 'Electricity, Water, Gas',
          calculationType: 'FIXED',
          defaultAmountPaisa: 15_000_000n, // ৳1,50,000
          isIncludedInNetPrice: false,
          vatRatePct: 5.0,
          payableStage: 'AT_HANDOVER',
          isActive: true,
        },
      });
      seededUtilityId = utility.id;

      await tx.chargeType.create({
        data: {
          companyId: ctx.companyAId,
          code: 'REG_DEMO',
          name: 'Registration & Stamp Duty',
          calculationType: 'PERCENTAGE',
          defaultRatePct: 8.0,
          isIncludedInNetPrice: false,
          vatRatePct: 0.0,
          payableStage: 'AT_HANDOVER',
          isActive: true,
        },
      });
    });
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.close();
    }
  });

  describe('S2 & S3: Charge Calculation Endpoint (POST /api/v1/sales/charges/calculate)', () => {
    it('calculates itemised charges with mixed fixed + percentage + VAT strictly via Money', async () => {
      // Net property price: ৳1,00,00,000 (10,000,000.00 = 1,000,000,000 paisa)
      // Charges:
      // 1. Utility (Fixed): ৳1,50,000 (15,000,000 paisa), VAT 5% = ৳7,500 (750,000 paisa) -> total ৳1,57,500
      // 2. Registration (Percentage): 8% of ৳1,00,00,000 = ৳8,00,000 (80,000,000 paisa), VAT 0% -> total ৳8,00,000
      // 3. Documentation (Included in net price): ৳50,000 (5,000,000 paisa), VAT 0% -> total ৳50,000 (not added to grand total)
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/charges/calculate')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          netPricePaisa: '1000000000',
          charges: [
            {
              chargeTypeId: seededUtilityId,
            },
            {
              name: 'Registration & Stamp Duty',
              chargeTypeCode: 'REG_INLINE',
              calculationType: 'PERCENTAGE',
              ratePct: 8.0,
              vatRatePct: 0.0,
              isIncludedInNetPrice: false,
              payableStage: 'AT_HANDOVER',
            },
            {
              name: 'Internal Documentation',
              chargeTypeCode: 'DOC_INC',
              calculationType: 'FIXED',
              amountPaisa: '5000000',
              vatRatePct: 0.0,
              isIncludedInNetPrice: true,
              payableStage: 'AT_BOOKING',
            },
          ],
        })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      const data = res.body.data;

      expect(data.netPricePaisa).toBe('1000000000');
      expect(data.netPriceFormatted).toBe('৳1,00,00,000.00');

      // Utility item:
      const utilityItem = data.items.find(
        (it: { chargeTypeCode: string }) => it.chargeTypeCode === 'UTILITY_DEMO',
      );
      expect(utilityItem).toBeDefined();
      expect(utilityItem.baseAmountPaisa).toBe('15000000');
      expect(utilityItem.baseAmountFormatted).toBe('৳1,50,000.00');
      expect(utilityItem.vatRatePct).toBe(5);
      expect(utilityItem.vatAmountPaisa).toBe('750000');
      expect(utilityItem.vatAmountFormatted).toBe('৳7,500.00');
      expect(utilityItem.totalAmountPaisa).toBe('15750000');
      expect(utilityItem.totalAmountFormatted).toBe('৳1,57,500.00');

      // Registration item:
      const regItem = data.items.find(
        (it: { chargeTypeCode: string }) => it.chargeTypeCode === 'REG_INLINE',
      );
      expect(regItem).toBeDefined();
      expect(regItem.baseAmountPaisa).toBe('80000000'); // 8% of 1,000,000,000
      expect(regItem.baseAmountFormatted).toBe('৳8,00,000.00');
      expect(regItem.vatAmountPaisa).toBe('0');
      expect(regItem.totalAmountPaisa).toBe('80000000');

      // Included item:
      const incItem = data.items.find(
        (it: { chargeTypeCode: string }) => it.chargeTypeCode === 'DOC_INC',
      );
      expect(incItem).toBeDefined();
      expect(incItem.isIncludedInNetPrice).toBe(true);
      expect(incItem.baseAmountPaisa).toBe('5000000');

      // Summary totals:
      expect(data.totalIncludedChargesPaisa).toBe('5000000');
      expect(data.totalAdditionalChargesPaisa).toBe('95000000'); // 15,000,000 + 80,000,000
      expect(data.totalVatPaisa).toBe('750000');

      // grandTotal = netPrice (1,000,000,000) + additional (95,000,000) + vat (750,000) = 1,095,750,000
      expect(data.grandTotalPaisa).toBe('1095750000');
      expect(data.grandTotalFormatted).toBe('৳1,09,57,500.00');
    });

    it('rejects calculation when chargeTypeId does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/charges/calculate')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          netPricePaisa: '500000000',
          charges: [{ chargeTypeId: fakeId }],
        })
        .expect(HttpStatus.NOT_FOUND);

      expect(res.body.error.code).toBe(ERROR_CODES.NOT_FOUND);
      expect(res.body.error.message).toContain(`Charge type not found: ${fakeId}`);
    });
  });

  describe('S1: Charge Types CRUD & Permissions', () => {
    it('creates a new charge type as MD (settings:edit permission)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/charges')
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          code: 'PARKING_BASEMENT',
          name: 'Basement Parking Space',
          description: 'Single covered car parking bay in Basement-1',
          calculationType: 'FIXED',
          defaultAmountPaisa: '60000000', // ৳6,00,000
          isIncludedInNetPrice: false,
          payableStage: 'AT_BOOKING',
          vatRatePct: 0.0,
          accountCode: '2020',
          isActive: true,
        })
        .expect(HttpStatus.CREATED);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.code).toBe('PARKING_BASEMENT');
      expect(res.body.data.name).toBe('Basement Parking Space');
      expect(res.body.data.defaultAmountPaisa).toBe('60000000');
      expect(res.body.data.defaultAmountFormatted).toBe('৳6,00,000.00');
      expect(res.body.data.payableStage).toBe('AT_BOOKING');

      createdChargeTypeId = res.body.data.id;
    });

    it('rejects charge type creation by sales executive without settings:edit permission (403 Forbidden)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/charges')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          code: 'UNAUTHORIZED_FEE',
          name: 'Unauthorized Fee',
          calculationType: 'FIXED',
          defaultAmountPaisa: '1000000',
        })
        .expect(HttpStatus.FORBIDDEN);

      expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    });

    it('rejects duplicate code with 409 Conflict', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/charges')
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          code: 'PARKING_BASEMENT',
          name: 'Duplicate Basement Parking',
          calculationType: 'FIXED',
          defaultAmountPaisa: '60000000',
        })
        .expect(HttpStatus.CONFLICT);

      expect(res.body.error.code).toBe(ERROR_CODES.CONFLICT);
      expect(res.body.error.message).toContain('already exists');
    });

    it('lists and filters charge types with pagination', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/sales/charges?search=Parking&payableStage=AT_BOOKING')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].code).toBe('PARKING_BASEMENT');
      expect(res.body.data.total).toBe(1);
    });

    it('gets a single charge type by ID', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/charges/${createdChargeTypeId}`)
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdChargeTypeId);
      expect(res.body.data.code).toBe('PARKING_BASEMENT');
    });

    it('updates a charge type as MD', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/sales/charges/${createdChargeTypeId}`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          name: 'Premium Basement Parking Bay',
          defaultAmountPaisa: '75000000', // ৳7,50,000
          vatRatePct: 2.5,
        })
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Premium Basement Parking Bay');
      expect(res.body.data.defaultAmountPaisa).toBe('75000000');
      expect(res.body.data.defaultAmountFormatted).toBe('৳7,50,000.00');
      expect(res.body.data.vatRatePct).toBe(2.5);
    });

    it('soft deletes a charge type and ensures it is excluded from list queries', async () => {
      const res = await request(ctx.app.getHttpServer())
        .delete(`/api/v1/sales/charges/${createdChargeTypeId}`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.success).toBe(true);

      // Verify it cannot be retrieved by ID
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/charges/${createdChargeTypeId}`)
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('Multi-Tenancy & RLS Isolation', () => {
    it('prevents Company B from reading or updating Company A charge types', async () => {
      // Seed a charge type specifically in Company A
      let companyAChargeId: string;
      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const ct = await tx.chargeType.create({
          data: {
            companyId: ctx.companyAId,
            code: 'COMPANY_A_CHARGE',
            name: 'Company A Specific Fee',
            calculationType: 'FIXED',
            defaultAmountPaisa: 1000000n,
            payableStage: 'AT_BOOKING',
          },
        });
        companyAChargeId = ct.id;
      });

      // Company B tries to retrieve Company A's charge type
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/charges/${companyAChargeId!}`)
        .set('Authorization', `Bearer ${ctx.companyBToken}`)
        .expect(HttpStatus.NOT_FOUND);

      // Company B tries to calculate using Company A's chargeTypeId
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/charges/calculate')
        .set('Authorization', `Bearer ${ctx.companyBToken}`)
        .send({
          netPricePaisa: '100000000',
          charges: [{ chargeTypeId: companyAChargeId! }],
        })
        .expect(HttpStatus.NOT_FOUND);

      expect(res.body.error.code).toBe(ERROR_CODES.NOT_FOUND);
    });
  });
});
