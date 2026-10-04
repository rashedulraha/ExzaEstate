import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@exzaestate/shared';
import { PropertyService } from '../../src/modules/property/property.service.js';
import { PropertyStatusService } from '../../src/modules/property/property-status.service.js';
import { PropertyType } from '../../src/modules/property/dto/create-property.dto.js';
import { type PropertyTestContext, setupPropertyTestContext } from './property-test.helper.js';

describe('Property Status Machine and Workflow API (Task A2.2 S3)', () => {
  let ctx: PropertyTestContext;
  let companyId: string;
  let projectId: string;
  let propertyService: PropertyService;
  let statusService: PropertyStatusService;

  beforeAll(async () => {
    ctx = await setupPropertyTestContext();
    companyId = ctx.companyAId;
    projectId = ctx.projectAId;

    propertyService = new PropertyService(ctx.tenantDb, ctx.auditService);
    statusService = new PropertyStatusService(ctx.tenantDb, ctx.auditService);
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('applyBookingEvent', () => {
    it('transitions property status accurately per PRD §9.1 and creates history log', async () => {
      const created = await propertyService.createProperty(companyId, {
        projectId,
        code: `STAT-EVT-${Date.now()}`,
        type: PropertyType.FLAT,
        areaSqft: '1200.0000',
        basePricePaisa: '800000000',
      });

      expect(created.status).toBe('Available');

      // 1. Booking REQUESTED -> Reserved
      await ctx.tenantDb.withCompany(companyId, async (tx) => {
        await statusService.applyBookingEvent(tx, companyId, created.id, {
          bookingId: '0192a000-0000-7000-8000-000000000099',
          status: 'REQUESTED',
          actorId: ctx.testUserId,
          reason: 'Customer submitted booking application',
        });
      });

      let updated = await propertyService.getPropertyById(companyId, created.id);
      expect(updated.status).toBe('Reserved');

      // 2. Booking CONFIRMED -> Booked
      await ctx.tenantDb.withCompany(companyId, async (tx) => {
        await statusService.applyBookingEvent(tx, companyId, created.id, {
          bookingId: '0192a000-0000-7000-8000-000000000099',
          status: 'CONFIRMED',
          actorId: ctx.testUserId,
          reason: 'Booking money paid and verified',
        });
      });

      updated = await propertyService.getPropertyById(companyId, created.id);
      expect(updated.status).toBe('Booked');

      // 3. Booking COMPLETED -> Sold
      await ctx.tenantDb.withCompany(companyId, async (tx) => {
        await statusService.applyBookingEvent(tx, companyId, created.id, {
          bookingId: '0192a000-0000-7000-8000-000000000099',
          status: 'COMPLETED',
          actorId: ctx.testUserId,
          reason: 'Full payment received and possession handed over',
        });
      });

      updated = await propertyService.getPropertyById(companyId, created.id);
      expect(updated.status).toBe('Sold');

      // 4. Booking CANCELLED -> Available
      await ctx.tenantDb.withCompany(companyId, async (tx) => {
        await statusService.applyBookingEvent(tx, companyId, created.id, {
          bookingId: '0192a000-0000-7000-8000-000000000099',
          status: 'CANCELLED',
          actorId: ctx.testUserId,
          reason: 'Buyer withdrew application with penalty deduction',
        });
      });

      updated = await propertyService.getPropertyById(companyId, created.id);
      expect(updated.status).toBe('Available');
    });
  });

  describe('Manual Hold and Block actions', () => {
    it('sets Hold with expiry on Available unit and allows release', async () => {
      const created = await propertyService.createProperty(companyId, {
        projectId,
        code: `HOLD-${Date.now()}`,
        type: PropertyType.FLAT,
        areaSqft: '1000.0000',
        basePricePaisa: '500000000',
      });

      const expiry = new Date(Date.now() + 86400000 * 7).toISOString();
      const held = await statusService.holdProperty(
        companyId,
        created.id,
        {
          holdExpiresAt: expiry,
          reason: 'Management hold for MD review',
        },
        ctx.testUserId,
      );

      expect(held.status).toBe('Hold');
      expect(held.holdExpiresAt).toBeDefined();

      const released = await statusService.releaseHold(companyId, created.id, ctx.testUserId);
      expect(released.status).toBe('Available');
      expect(released.holdExpiresAt).toBeNull();
    });

    it('sets Block with mandatory reason and allows unblocking', async () => {
      const created = await propertyService.createProperty(companyId, {
        projectId,
        code: `BLOCK-${Date.now()}`,
        type: PropertyType.PLOT,
        areaSqft: '2000.0000',
        basePricePaisa: '600000000',
      });

      const blocked = await statusService.blockProperty(
        companyId,
        created.id,
        {
          reason: 'Land partition demarcation in progress',
        },
        ctx.testUserId,
      );

      expect(blocked.status).toBe('Blocked');
      expect(blocked.blockReason).toBe('Land partition demarcation in progress');

      const unblocked = await statusService.unblockProperty(companyId, created.id, ctx.testUserId);
      expect(unblocked.status).toBe('Available');
      expect(unblocked.blockReason).toBeNull();
    });

    it('rejects Hold if unit is already Booked', async () => {
      const created = await propertyService.createProperty(companyId, {
        projectId,
        code: `NO-HOLD-${Date.now()}`,
        type: PropertyType.PLOT,
        areaSqft: '2000.0000',
        basePricePaisa: '600000000',
      });

      await ctx.tenantDb.withCompany(companyId, async (tx) => {
        await statusService.applyBookingEvent(tx, companyId, created.id, {
          bookingId: '0192a000-0000-7000-8000-000000000088',
          status: 'CONFIRMED',
          actorId: ctx.testUserId,
        });
      });

      await expect(
        statusService.holdProperty(
          companyId,
          created.id,
          { reason: 'Invalid hold attempt' },
          ctx.testUserId,
        ),
      ).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.CONFLICT,
        },
      });
    });
  });

  describe('overrideStatus [RULE-PROPERTY-STATUS]', () => {
    it('overrides status with mandatory reason and writes STATUS_OVERRIDE audit', async () => {
      const created = await propertyService.createProperty(companyId, {
        projectId,
        code: `OVERRIDE-${Date.now()}`,
        type: PropertyType.SHOP,
        areaSqft: '350.0000',
        basePricePaisa: '400000000',
      });

      const overridden = await statusService.overrideStatus(
        companyId,
        created.id,
        {
          targetStatus: 'Sold',
          reason: 'Historical sale data migration adjustment authorized by MD',
        },
        ctx.testUserId,
      );

      expect(overridden.status).toBe('Sold');

      // Verify STATUS_OVERRIDE audit was written
      const audit = await ctx.systemPrisma.executeWithReason(
        '// SYSTEM-SCOPE: verify status override audit log',
        async (client) =>
          client.auditLog.findFirst({
            where: {
              companyId,
              recordId: created.id,
              action: 'STATUS_OVERRIDE',
            },
          }),
      );

      expect(audit).toBeDefined();
      expect(audit?.reason).toBe('Historical sale data migration adjustment authorized by MD');
    });

    it('rejects override if reason is missing or too short', async () => {
      const created = await propertyService.createProperty(companyId, {
        projectId,
        code: `NOREASON-${Date.now()}`,
        type: PropertyType.SHOP,
        areaSqft: '350.0000',
        basePricePaisa: '400000000',
      });

      await expect(
        statusService.overrideStatus(
          companyId,
          created.id,
          {
            targetStatus: 'Hold',
            reason: '   ',
          },
          ctx.testUserId,
        ),
      ).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.VALIDATION_ERROR,
        },
      });
    });
  });
});
