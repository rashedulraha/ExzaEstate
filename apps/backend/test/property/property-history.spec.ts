import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PropertyService } from '../../src/modules/property/property.service.js';
import { PropertyStatusService } from '../../src/modules/property/property-status.service.js';
import { type PropertyTestContext, setupPropertyTestContext } from './property-test.helper.js';

import { PropertyType } from '../../src/modules/property/dto/create-property.dto.js';

describe('Property Status History API (Task A2.2 S4)', () => {
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

  it('records and returns full audit timeline (who/what/when/why) for status transitions', async () => {
    // 1. Create property
    const created = await propertyService.createProperty(
      companyId,
      {
        projectId,
        code: `HIST-${Date.now()}`,
        type: PropertyType.FLAT,
        areaSqft: '1100.0000',
        basePricePaisa: '700000000',
      },
      ctx.testUserId,
    );

    // 2. Put on Hold
    await statusService.holdProperty(
      companyId,
      created.id,
      { reason: 'Hold requested by management' },
      ctx.testUserId,
    );

    // 3. Release Hold
    await statusService.releaseHold(companyId, created.id, ctx.testUserId);

    // 4. Override status to Sold
    await statusService.overrideStatus(
      companyId,
      created.id,
      {
        targetStatus: 'Sold',
        reason: 'Authorized manual override for VIP buyer',
      },
      ctx.testUserId,
    );

    // 5. Query status history
    const history = await statusService.getStatusHistory(companyId, created.id);
    expect(history.length).toBe(4);

    const [entry0, entry1, entry2, entry3] = history;

    // Entry 0 (most recent): Sold
    expect(entry0!.fromStatus).toBe('Available');
    expect(entry0!.toStatus).toBe('Sold');
    expect(entry0!.reason).toBe('Authorized manual override for VIP buyer');
    expect(entry0!.changedById).toBe(ctx.testUserId);
    expect(entry0!.metadata).toEqual({ override: true });

    // Entry 1: Hold -> Available
    expect(entry1!.fromStatus).toBe('Hold');
    expect(entry1!.toStatus).toBe('Available');

    // Entry 2: Available -> Hold
    expect(entry2!.fromStatus).toBe('Available');
    expect(entry2!.toStatus).toBe('Hold');
    expect(entry2!.reason).toBe('Hold requested by management');

    // Entry 3: Initial creation
    expect(entry3!.fromStatus).toBeNull();
    expect(entry3!.toStatus).toBe('Available');
    expect(entry3!.reason).toBe('Initial unit creation');
  });
});
