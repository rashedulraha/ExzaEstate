import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PROPERTY_STATUSES } from '@exzaestate/shared';
import { PropertyTestContext, setupPropertyTestContext } from './property-test.helper.js';
import {
  buildPropertyBlockFixture,
  buildPropertyFloorFixture,
  buildPropertyFixture,
} from '../factories/property.factory.js';

describe('Task A2.1: Property Data Model, Hierarchy & RLS (Tier 1)', () => {
  let ctx: PropertyTestContext;
  let blockAId: string;
  let floorAId: string;

  beforeAll(async () => {
    ctx = await setupPropertyTestContext();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('S1: Property Hierarchy (Project → Block → Floor → Property)', () => {
    it('creates Block, Floor, and Property with full hierarchy and relations', async () => {
      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const block = await tx.propertyBlock.create({
          data: {
            companyId: ctx.companyAId,
            projectId: ctx.projectAId,
            code: 'BLK-TEST-A',
            name: 'Block A (Residential Wing)',
            type: 'BLOCK',
            createdById: ctx.testUserId,
          },
        });
        expect(block.id).toBeDefined();
        blockAId = block.id;

        const floor = await tx.propertyFloor.create({
          data: {
            companyId: ctx.companyAId,
            projectId: ctx.projectAId,
            blockId: blockAId,
            code: 'FL-TEST-05',
            name: '5th Floor',
            floorNumber: 5,
            type: 'FLOOR',
            createdById: ctx.testUserId,
          },
        });
        expect(floor.id).toBeDefined();
        floorAId = floor.id;

        const property = await tx.property.create({
          data: {
            companyId: ctx.companyAId,
            projectId: ctx.projectAId,
            blockId: blockAId,
            floorId: floorAId,
            code: 'PROP-TEST-5A',
            title: 'Flat 5A (South Facing)',
            type: 'FLAT',
            status: PROPERTY_STATUSES.AVAILABLE,
            areaSqft: 1850.5,
            facing: 'SOUTH',
            basePricePaisa: 1500000000n,
            premiumPaisa: 50000000n,
            discountLimitPct: 5.0,
            netPricePaisa: 1550000000n,
            ownerType: 'COMPANY',
            createdById: ctx.testUserId,
          },
          include: { block: true, floor: true },
        });

        expect(property.id).toBeDefined();
        expect(property.code).toBe('PROP-TEST-5A');
        expect(property.type).toBe('FLAT');
        expect(property.status).toBe(PROPERTY_STATUSES.AVAILABLE);
        expect(property.areaSqft.toString()).toBe('1850.5');
        expect(typeof property.basePricePaisa).toBe('bigint');
        expect(property.basePricePaisa).toBe(1500000000n);
        expect(property.netPricePaisa).toBe(1550000000n);
        expect(property.ownerType).toBe('COMPANY');
        expect(property.block?.code).toBe('BLK-TEST-A');
        expect(property.floor?.code).toBe('FL-TEST-05');
      });
    });

    it('enforces all six canonical property status enum values', async () => {
      const allowedStatuses = [
        PROPERTY_STATUSES.AVAILABLE,
        PROPERTY_STATUSES.HOLD,
        PROPERTY_STATUSES.RESERVED,
        PROPERTY_STATUSES.BOOKED,
        PROPERTY_STATUSES.SOLD,
        PROPERTY_STATUSES.BLOCKED,
      ];

      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        for (let i = 0; i < allowedStatuses.length; i++) {
          const status = allowedStatuses[i]!;
          const prop = await tx.property.create({
            data: {
              companyId: ctx.companyAId,
              projectId: ctx.projectAId,
              code: `PROP-TEST-STATUS-${i}`,
              title: `Unit Status ${status}`,
              type: 'PLOT',
              status,
              areaSqft: 2160.0,
              basePricePaisa: 500000000n,
              netPricePaisa: 500000000n,
              ownerType: 'COMPANY',
            },
          });
          expect(prop.status).toBe(status);
        }
      });
    });
  });

  describe('S2: Partial Unique Constraint & Soft Delete', () => {
    it('enforces unique (project_id, code) among active properties', async () => {
      const duplicateCode = 'PROP-TEST-DUP-01';

      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        await tx.property.create({
          data: {
            companyId: ctx.companyAId,
            projectId: ctx.projectAId,
            code: duplicateCode,
            type: 'PLOT',
            status: PROPERTY_STATUSES.AVAILABLE,
            areaSqft: 2000,
            basePricePaisa: 100000000n,
            netPricePaisa: 100000000n,
          },
        });

        await expect(
          tx.property.create({
            data: {
              companyId: ctx.companyAId,
              projectId: ctx.projectAId,
              code: duplicateCode,
              type: 'FLAT',
              status: PROPERTY_STATUSES.AVAILABLE,
              areaSqft: 1500,
              basePricePaisa: 80000000n,
              netPricePaisa: 80000000n,
            },
          }),
        ).rejects.toThrow();
      });
    });

    it('allows re-using code after soft delete (partial unique WHERE deleted_at IS NULL)', async () => {
      const reusableCode = 'PROP-TEST-REUSE-01';

      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const original = await tx.property.create({
          data: {
            companyId: ctx.companyAId,
            projectId: ctx.projectAId,
            code: reusableCode,
            type: 'PLOT',
            status: PROPERTY_STATUSES.AVAILABLE,
            areaSqft: 1800,
            basePricePaisa: 100000000n,
            netPricePaisa: 100000000n,
          },
        });

        await tx.property.update({
          where: { id: original.id },
          data: { deletedAt: new Date() },
        });

        const recreated = await tx.property.create({
          data: {
            companyId: ctx.companyAId,
            projectId: ctx.projectAId,
            code: reusableCode,
            type: 'PLOT',
            status: PROPERTY_STATUSES.AVAILABLE,
            areaSqft: 1800,
            basePricePaisa: 120000000n,
            netPricePaisa: 120000000n,
          },
        });

        expect(recreated.id).not.toBe(original.id);
        expect(recreated.code).toBe(reusableCode);
      });
    });
  });

  describe('S2 & S3: Multi-Tenancy & RLS Isolation', () => {
    it('prevents Company B from reading Company A properties via TenantPrisma / RLS', async () => {
      let companyAPropId: string;

      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const prop = await tx.property.create({
          data: {
            companyId: ctx.companyAId,
            projectId: ctx.projectAId,
            code: 'PROP-TEST-ISOLATION-A',
            type: 'FLAT',
            status: PROPERTY_STATUSES.AVAILABLE,
            areaSqft: 1200,
            basePricePaisa: 90000000n,
            netPricePaisa: 90000000n,
          },
        });
        companyAPropId = prop.id;
      });

      await ctx.tenantDb.withCompany(ctx.companyBId, async (tx) => {
        const readProp = await tx.property.findUnique({
          where: { id: companyAPropId },
        });
        expect(readProp).toBeNull();

        const listProps = await tx.property.findMany({
          where: { code: 'PROP-TEST-ISOLATION-A' },
        });
        expect(listProps).toHaveLength(0);
      });
    });

    it('rejects cross-tenant insert with foreign companyId via RLS WITH CHECK', async () => {
      await expect(
        ctx.tenantDb.withCompany(ctx.companyBId, async (tx) => {
          await tx.property.create({
            data: {
              companyId: ctx.companyAId,
              projectId: ctx.projectAId,
              code: 'PROP-TEST-SPOOF',
              type: 'FLAT',
              status: PROPERTY_STATUSES.AVAILABLE,
              areaSqft: 1000,
              basePricePaisa: 50000000n,
              netPricePaisa: 50000000n,
            },
          });
        }),
      ).rejects.toThrow();
    });
  });

  describe('S3: Factories & Demo Seed (50+ Units across all 6 Statuses)', () => {
    it('creates entities using property factories', async () => {
      await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
        const blockFixture = buildPropertyBlockFixture({
          companyId: ctx.companyAId,
          projectId: ctx.projectAId,
          code: 'BLK-TEST-FAC',
        });
        const block = await tx.propertyBlock.create({ data: blockFixture });
        expect(block.id).toBeDefined();

        const floorFixture = buildPropertyFloorFixture({
          companyId: ctx.companyAId,
          projectId: ctx.projectAId,
          blockId: block.id,
          code: 'FL-TEST-FAC',
        });
        const floor = await tx.propertyFloor.create({ data: floorFixture });
        expect(floor.id).toBeDefined();

        const propFixture = buildPropertyFixture({
          companyId: ctx.companyAId,
          projectId: ctx.projectAId,
          blockId: block.id,
          floorId: floor.id,
          code: 'PROP-TEST-FAC',
          status: PROPERTY_STATUSES.AVAILABLE,
        });
        const prop = await tx.property.create({ data: propFixture });
        expect(prop.id).toBeDefined();
        expect(prop.code).toBe('PROP-TEST-FAC');
      });
    });

    it('verifies demo seed generated 50+ units across all 6 canonical statuses', async () => {
      const demoCompany = await ctx.systemPrisma.executeWithReason(
        '// SYSTEM-SCOPE: Query company metadata to verify demo seed',
        async (client) => {
          return client.company.findFirst({
            where: { code: 'EXZA' },
          });
        },
      );
      expect(demoCompany).toBeDefined();

      await ctx.tenantDb.withCompany(demoCompany!.id, async (tx) => {
        const allProperties = await tx.property.findMany({
          where: { companyId: demoCompany!.id, deletedAt: null },
        });

        expect(allProperties.length).toBeGreaterThanOrEqual(50);

        const statusCounts = new Map<string, number>();
        for (const p of allProperties) {
          statusCounts.set(p.status, (statusCounts.get(p.status) || 0) + 1);
        }

        expect(statusCounts.get(PROPERTY_STATUSES.AVAILABLE) || 0).toBeGreaterThanOrEqual(10);
        expect(statusCounts.get(PROPERTY_STATUSES.HOLD) || 0).toBeGreaterThanOrEqual(1);
        expect(statusCounts.get(PROPERTY_STATUSES.RESERVED) || 0).toBeGreaterThanOrEqual(1);
        expect(statusCounts.get(PROPERTY_STATUSES.BOOKED) || 0).toBeGreaterThanOrEqual(1);
        expect(statusCounts.get(PROPERTY_STATUSES.SOLD) || 0).toBeGreaterThanOrEqual(1);
        expect(statusCounts.get(PROPERTY_STATUSES.BLOCKED) || 0).toBeGreaterThanOrEqual(1);

        for (const p of allProperties) {
          expect(typeof p.basePricePaisa).toBe('bigint');
          expect(typeof p.netPricePaisa).toBe('bigint');
          expect(p.netPricePaisa).toBeGreaterThanOrEqual(p.basePricePaisa);
        }
      });
    });
  });
});
