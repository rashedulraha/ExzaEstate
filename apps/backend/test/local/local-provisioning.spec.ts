import { describe, expect, it, vi } from 'vitest';
import type { SystemPrisma } from '../../src/database/system-prisma.service.js';
import type { TenantDb } from '../../src/database/tenant-db.service.js';
import { LocalProvisioningService } from '../../src/modules/local-data/local-provisioning.service.js';
import type { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

describe('A10.1 — Local First-Launch Provisioning', () => {
  it('detects unprovisioned state when company count is 0', async () => {
    const mockSystemPrisma = {
      executeWithReason: vi.fn().mockImplementation(async (_reason: string, cb: (client: unknown) => Promise<unknown>) => {
        const client = { company: { count: vi.fn().mockResolvedValue(0) } };
        return cb(client);
      }),
    } as unknown as SystemPrisma;

    const service = new LocalProvisioningService(
      mockSystemPrisma,
      {} as TenantDb,
      {} as TenantProvisioningService,
    );

    const isProv = await service.isProvisioned();
    expect(isProv).toBe(false);
  });

  it('provisions default company, MD admin, and sets single_user_auto_approve=true', async () => {
    let companyCount = 0;
    const mockSystemPrisma = {
      executeWithReason: vi.fn().mockImplementation(async (_reason: string, cb: (client: unknown) => Promise<unknown>) => {
        const client = { company: { count: vi.fn().mockResolvedValue(companyCount) } };
        return cb(client);
      }),
    } as unknown as SystemPrisma;

    const mockProvisioningService = {
      provisionCompany: vi.fn().mockResolvedValue({
        companyId: 'comp-local-1',
        companyCode: 'LOCAL01',
        branchId: 'branch-1',
        managingDirectorUserId: 'admin-1',
      }),
    } as unknown as TenantProvisioningService;

    const mockTx = {
      companySetting: {
        upsert: vi.fn(),
      },
    };

    const mockTenantDb = {
      withCompany: vi.fn().mockImplementation(async (_cid: string, cb: (tx: unknown) => Promise<unknown>) => {
        return cb(mockTx);
      }),
    } as unknown as TenantDb;

    const service = new LocalProvisioningService(
      mockSystemPrisma,
      mockTenantDb,
      mockProvisioningService,
    );

    const result = await service.provisionLocalStandalone({
      companyName: 'Acme Real Estate',
      companyCode: 'ACME01',
      adminEmail: 'admin@acme.local',
    });

    expect(result.provisioned).toBe(true);
    expect(result.companyId).toBe('comp-local-1');
    expect(mockProvisioningService.provisionCompany).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme Real Estate',
        code: 'ACME01',
        managingDirector: expect.objectContaining({
          email: 'admin@acme.local',
          isLocalMode: true,
        }),
      }),
    );

    expect(mockTenantDb.withCompany).toHaveBeenCalledWith('comp-local-1', expect.any(Function));
    expect(mockTx.companySetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId_key: { companyId: 'comp-local-1', key: 'single_user_auto_approve' },
        }),
        update: { value: true },
        create: { companyId: 'comp-local-1', key: 'single_user_auto_approve', value: true },
      }),
    );
  });

  it('skips provisioning if company already exists (idempotency)', async () => {
    const existingCompany = {
      id: 'existing-comp-1',
      code: 'EXISTING',
      branches: [{ id: 'br-head' }],
      users: [{ id: 'usr-admin' }],
    };

    const mockSystemPrisma = {
      executeWithReason: vi.fn().mockImplementation(async (_reason: string, cb: (client: unknown) => Promise<unknown>) => {
        const client = {
          company: {
            count: vi.fn().mockResolvedValue(1),
            findFirst: vi.fn().mockResolvedValue(existingCompany),
          },
        };
        return cb(client);
      }),
    } as unknown as SystemPrisma;

    const mockProvisioningService = {
      provisionCompany: vi.fn(),
    } as unknown as TenantProvisioningService;

    const service = new LocalProvisioningService(
      mockSystemPrisma,
      {} as TenantDb,
      mockProvisioningService,
    );

    const result = await service.provisionLocalStandalone();

    expect(result.provisioned).toBe(false);
    expect(result.companyId).toBe('existing-comp-1');
    expect(mockProvisioningService.provisionCompany).not.toHaveBeenCalled();
  });
});
