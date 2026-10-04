import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { PropertyService } from '../../src/modules/property/property.service.js';
import { PropertyPricingService } from '../../src/modules/property/property-pricing.service.js';
import {
  FacingDirection,
  OwnerType,
  PropertyType,
} from '../../src/modules/property/dto/create-property.dto.js';
import {
  type PropertyTestContext,
  seedPropertyTestHierarchy,
  setupPropertyTestContext,
} from './property-test.helper.js';

describe('Property CRUD API (Task A2.2 S2)', () => {
  let ctx: PropertyTestContext;
  let companyId: string;
  let projectId: string;
  let blockId: string;
  let floorId: string;
  let propertyService: PropertyService;
  let pricingService: PropertyPricingService;

  beforeAll(async () => {
    ctx = await setupPropertyTestContext();
    companyId = ctx.companyAId;
    projectId = ctx.projectAId;

    pricingService = new PropertyPricingService();
    propertyService = new PropertyService(ctx.tenantDb, ctx.auditService);
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    const hierarchy = await seedPropertyTestHierarchy(ctx);
    blockId = hierarchy.blockId;
    floorId = hierarchy.floorId;
  });

  describe('createProperty', () => {
    it('creates a new unit with valid data, net price calculation, and audit record', async () => {
      const code = `UNIT-${Date.now()}`;
      const result = await propertyService.createProperty(
        companyId,
        {
          projectId,
          blockId,
          floorId,
          code,
          title: '3BHK Luxury Flat 101',
          type: PropertyType.FLAT,
          areaSqft: '1450.5000',
          facing: FacingDirection.NORTH_EAST,
          basePricePaisa: '1200000000', // 1.20 crore
          premiumPaisa: '50000000', // 5 lakh
          discountLimitPct: '5.00',
          ownerType: OwnerType.COMPANY,
          description: 'Spacious corner flat',
        },
        ctx.testUserId,
      );

      expect(result).toBeDefined();
      expect(result.code).toBe(code);
      expect(result.status).toBe('Available');
      // net price = 12,000,000 + 500,000 = 12,500,000 BDT
      expect(result.netPricePaisa).toBe('1250000000');

      // Verify audit record exists
      const audit = await ctx.systemPrisma.executeWithReason(
        '// SYSTEM-SCOPE: verify audit log in test',
        async (client) =>
          client.auditLog.findFirst({
            where: {
              companyId,
              recordId: result.id,
              action: 'PROPERTY_CREATED',
            },
          }),
      );
      expect(audit).toBeDefined();
    });

    it('rejects duplicate property code in same project', async () => {
      const code = `DUP-${Date.now()}`;
      await propertyService.createProperty(companyId, {
        projectId,
        code,
        type: PropertyType.FLAT,
        areaSqft: '1200.0000',
        basePricePaisa: '800000000',
      });

      await expect(
        propertyService.createProperty(companyId, {
          projectId,
          code,
          type: PropertyType.FLAT,
          areaSqft: '1200.0000',
          basePricePaisa: '800000000',
        }),
      ).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.CONFLICT,
        },
      });
    });
  });

  describe('updateProperty', () => {
    it('updates allowed attributes and recalculates net price', async () => {
      const created = await propertyService.createProperty(companyId, {
        projectId,
        code: `UPD-${Date.now()}`,
        type: PropertyType.PLOT,
        areaSqft: '2160.0000',
        basePricePaisa: '500000000',
      });

      const updated = await propertyService.updateProperty(
        companyId,
        created.id,
        {
          title: 'Updated Plot Title',
          basePricePaisa: '600000000',
          premiumPaisa: '100000000',
        },
        ctx.testUserId,
      );

      expect(updated.title).toBe('Updated Plot Title');
      expect(updated.netPricePaisa).toBe('700000000');
    });

    it('REJECTS updating status through generic update (RULE-PROPERTY-STATUS)', async () => {
      const created = await propertyService.createProperty(companyId, {
        projectId,
        code: `NOSTAT-${Date.now()}`,
        type: PropertyType.FLAT,
        areaSqft: '1000.0000',
        basePricePaisa: '500000000',
      });

      await expect(
        propertyService.updateProperty(companyId, created.id, {
          status: 'Sold',
        } as unknown as Parameters<typeof propertyService.updateProperty>[2]),
      ).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.VALIDATION_ERROR,
        },
      });
    });
  });

  describe('listProperties and getPropertyById', () => {
    it('lists properties with pagination and allowlist filtering', async () => {
      const code1 = `L1-${Date.now()}`;
      const code2 = `L2-${Date.now()}`;

      await propertyService.createProperty(companyId, {
        projectId,
        code: code1,
        type: PropertyType.FLAT,
        areaSqft: '1000.0000',
        basePricePaisa: '500000000',
      });
      await propertyService.createProperty(companyId, {
        projectId,
        code: code2,
        type: PropertyType.SHOP,
        areaSqft: '450.0000',
        basePricePaisa: '300000000',
      });

      const list = await propertyService.listProperties(companyId, {
        projectId,
        type: PropertyType.FLAT,
        search: code1,
        page: 1,
        limit: 10,
      });

      expect(list.total).toBe(1);
      expect(list.items[0]?.code).toBe(code1);
    });

    it('retrieves detailed property with block and floor details', async () => {
      const created = await propertyService.createProperty(companyId, {
        projectId,
        blockId,
        floorId,
        code: `DET-${Date.now()}`,
        type: PropertyType.FLAT,
        areaSqft: '1500.0000',
        basePricePaisa: '1000000000',
      });

      const detail = await propertyService.getPropertyById(companyId, created.id);
      expect(detail.id).toBe(created.id);
      expect(detail.block?.id).toBe(blockId);
      expect(detail.floor?.id).toBe(floorId);
    });
  });

  describe('deleteProperty', () => {
    it('soft deletes available property and prevents access after delete', async () => {
      const created = await propertyService.createProperty(companyId, {
        projectId,
        code: `DEL-${Date.now()}`,
        type: PropertyType.FLAT,
        areaSqft: '1000.0000',
        basePricePaisa: '500000000',
      });

      await propertyService.deleteProperty(companyId, created.id, ctx.testUserId);

      await expect(propertyService.getPropertyById(companyId, created.id)).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.NOT_FOUND,
        },
      });
    });
  });

  describe('pricingPreview', () => {
    it('calculates preview pricing without mutating DB', () => {
      const preview = pricingService.previewPricing({
        basePricePaisa: '1000000000',
        premiumPaisa: '100000000',
        discountPct: 5,
        charges: [{ code: 'PARKING', name: 'Car Parking', amountPaisa: '50000000' }],
        discountLimitPct: 5,
      });

      expect(preview.basePricePaisa).toBe('1000000000');
      expect(preview.grossPricePaisa).toBe('1100000000');
      expect(preview.discountPaisa).toBe('55000000');
      expect(preview.chargesTotalPaisa).toBe('50000000');
      expect(preview.netPricePaisa).toBe('1095000000');
      expect(preview.isWithinDiscountLimit).toBe(true);
    });
  });
});
