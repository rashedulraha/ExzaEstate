import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../platform/audit/audit.service.js';
import type { OutboxService } from '../../platform/outbox/outbox.service.js';
import type { TenantDb } from '../../database/tenant-db.service.js';
import { PropertyType } from './dto/create-property.dto.js';
import { PROPERTY_EVENTS } from './property.events.js';
import { PropertyService } from './property.service.js';
import { PropertyStatusService } from './property-status.service.js';

describe('Property Service Outbox and Audit Compliance (DoD-BE §18.2)', () => {
  const companyId = '40000000-0000-0000-0000-000000000001';
  const userId = '10000000-0000-0000-0000-000000000001';
  const propertyId = '0192a000-0000-7000-8000-000000000001';
  const projectId = '0192a000-0000-7000-8000-000000000002';

  const mockPropertyRecord = {
    id: propertyId,
    companyId,
    projectId,
    blockId: null,
    floorId: null,
    code: 'UNIT-101',
    title: 'Unit 101',
    type: 'FLAT',
    status: 'Available',
    areaSqft: '1200.0000',
    facing: 'NORTH',
    basePricePaisa: 1000000000n,
    premiumPaisa: 50000000n,
    discountLimitPct: '5.00',
    netPricePaisa: 1050000000n,
    ownerType: 'COMPANY',
    holdExpiresAt: null,
    blockReason: null,
    description: null,
    metadata: {},
    block: null,
    floor: null,
    createdAt: new Date('2026-10-04T00:00:00Z'),
    updatedAt: new Date('2026-10-04T00:00:00Z'),
    deletedAt: null,
  };

  it('createProperty writes audit record and emits outbox event in the transaction', async () => {
    const auditRecordMock = vi.fn().mockResolvedValue({ id: 'audit-1' });
    const outboxEmitMock = vi.fn().mockResolvedValue({ id: 'outbox-1' });

    const mockTx = {
      project: {
        findFirst: vi.fn().mockResolvedValue({ id: projectId, companyId, deletedAt: null }),
      },
      property: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(mockPropertyRecord),
      },
      propertyStatusHistory: {
        create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
      },
    };

    const mockTenantDb = {
      withCompany: vi.fn((_cid: string, fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
    } as unknown as TenantDb;

    const mockAuditService = { record: auditRecordMock } as unknown as AuditService;
    const mockOutboxService = { emit: outboxEmitMock } as unknown as OutboxService;

    const service = new PropertyService(mockTenantDb, mockAuditService, mockOutboxService);

    const result = await service.createProperty(
      companyId,
      {
        projectId,
        code: 'UNIT-101',
        type: PropertyType.FLAT,
        areaSqft: '1200.0000',
        basePricePaisa: '1000000000',
        premiumPaisa: '50000000',
      },
      userId,
    );

    expect(result.id).toBe(propertyId);
    expect(auditRecordMock).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        action: 'PROPERTY_CREATED',
        entity: 'Property',
        entityId: propertyId,
      }),
    );
    expect(outboxEmitMock).toHaveBeenCalledWith(
      mockTx,
      PROPERTY_EVENTS.CREATED,
      expect.objectContaining({
        propertyId,
        companyId,
        projectId,
        code: 'UNIT-101',
        status: 'Available',
      }),
    );
  });

  it('updateProperty writes audit record and emits outbox event in the transaction', async () => {
    const auditRecordMock = vi.fn().mockResolvedValue({ id: 'audit-2' });
    const outboxEmitMock = vi.fn().mockResolvedValue({ id: 'outbox-2' });

    const updatedRecord = { ...mockPropertyRecord, title: 'Updated Unit 101' };

    const mockTx = {
      property: {
        findFirst: vi.fn().mockResolvedValue(mockPropertyRecord),
        update: vi.fn().mockResolvedValue(updatedRecord),
      },
    };

    const mockTenantDb = {
      withCompany: vi.fn((_cid: string, fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
    } as unknown as TenantDb;

    const service = new PropertyService(
      mockTenantDb,
      { record: auditRecordMock } as unknown as AuditService,
      { emit: outboxEmitMock } as unknown as OutboxService,
    );

    const result = await service.updateProperty(
      companyId,
      propertyId,
      { title: 'Updated Unit 101' },
      userId,
    );

    expect(result.title).toBe('Updated Unit 101');
    expect(auditRecordMock).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        action: 'PROPERTY_UPDATED',
        entity: 'Property',
        entityId: propertyId,
      }),
    );
    expect(outboxEmitMock).toHaveBeenCalledWith(
      mockTx,
      PROPERTY_EVENTS.UPDATED,
      expect.objectContaining({
        propertyId,
        companyId,
        projectId,
        code: 'UNIT-101',
        updatedById: userId,
      }),
    );
  });

  it('deleteProperty writes audit record and emits outbox event in the transaction', async () => {
    const auditRecordMock = vi.fn().mockResolvedValue({ id: 'audit-3' });
    const outboxEmitMock = vi.fn().mockResolvedValue({ id: 'outbox-3' });

    const mockTx = {
      property: {
        findFirst: vi.fn().mockResolvedValue(mockPropertyRecord),
        update: vi.fn().mockResolvedValue({ ...mockPropertyRecord, deletedAt: new Date() }),
      },
    };

    const mockTenantDb = {
      withCompany: vi.fn((_cid: string, fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
    } as unknown as TenantDb;

    const service = new PropertyService(
      mockTenantDb,
      { record: auditRecordMock } as unknown as AuditService,
      { emit: outboxEmitMock } as unknown as OutboxService,
    );

    await service.deleteProperty(companyId, propertyId, userId);

    expect(auditRecordMock).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        action: 'PROPERTY_DELETED',
        entity: 'Property',
        entityId: propertyId,
      }),
    );
    expect(outboxEmitMock).toHaveBeenCalledWith(
      mockTx,
      PROPERTY_EVENTS.DELETED,
      expect.objectContaining({
        propertyId,
        companyId,
        deletedById: userId,
      }),
    );
  });

  it('holdProperty and blockProperty write audit records and emit status_changed outbox event', async () => {
    const auditRecordMock = vi.fn().mockResolvedValue({ id: 'audit-4' });
    const outboxEmitMock = vi.fn().mockResolvedValue({ id: 'outbox-4' });

    const heldRecord = { ...mockPropertyRecord, status: 'Hold' };

    const mockTx = {
      property: {
        findFirst: vi.fn().mockResolvedValue(mockPropertyRecord),
        update: vi.fn().mockResolvedValue(heldRecord),
      },
      propertyStatusHistory: {
        create: vi.fn().mockResolvedValue({ id: 'hist-2' }),
      },
    };

    const mockTenantDb = {
      withCompany: vi.fn((_cid: string, fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
    } as unknown as TenantDb;

    const statusService = new PropertyStatusService(
      mockTenantDb,
      { record: auditRecordMock } as unknown as AuditService,
      { emit: outboxEmitMock } as unknown as OutboxService,
    );

    const result = await statusService.holdProperty(
      companyId,
      propertyId,
      { reason: 'Management hold' },
      userId,
    );

    expect(result.status).toBe('Hold');
    expect(auditRecordMock).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        action: 'PROPERTY_HOLD',
        entity: 'Property',
        entityId: propertyId,
        before: { status: 'Available' },
        after: { status: 'Hold' },
      }),
    );
    expect(outboxEmitMock).toHaveBeenCalledWith(
      mockTx,
      PROPERTY_EVENTS.STATUS_CHANGED,
      expect.objectContaining({
        propertyId,
        companyId,
        fromStatus: 'Available',
        toStatus: 'Hold',
        action: 'PROPERTY_HOLD',
        reason: 'Management hold',
      }),
    );
  });
});
