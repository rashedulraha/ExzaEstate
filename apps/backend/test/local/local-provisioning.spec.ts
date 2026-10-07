import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '../../src/config/config.service.js';
import type { SystemPrisma } from '../../src/database/system-prisma.service.js';
import type { TenantDb } from '../../src/database/tenant-db.service.js';
import type { TokenService } from '../../src/modules/auth/token.service.js';
import { LocalProvisioningService } from '../../src/modules/local-data/local-provisioning.service.js';
import type { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

describe('A10.1 — Local First-Launch Provisioning', () => {
  const mockTokenService = {
    createSessionAndTokens: vi.fn().mockResolvedValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      sessionId: 'sess-1',
    }),
  } as unknown as TokenService;

  const mockConfigService = {
    initialLicenseKey: 'EXZA-ENTERPRISE-2026-ABCD-EF01-9999',
  } as unknown as ConfigService;

  it('detects unprovisioned state when active user count is 0', async () => {
    const mockSystemPrisma = {
      executeWithReason: vi
        .fn()
        .mockImplementation(async (_reason: string, cb: (client: unknown) => Promise<unknown>) => {
          const client = { user: { count: vi.fn().mockResolvedValue(0) } };
          return cb(client);
        }),
    } as unknown as SystemPrisma;

    const service = new LocalProvisioningService(
      mockSystemPrisma,
      {} as TenantDb,
      {} as TenantProvisioningService,
      mockTokenService,
      mockConfigService,
    );

    const isProv = await service.isProvisioned();
    expect(isProv).toBe(false);
  });

  it('provisions default company, MD admin, activates license, and issues session tokens', async () => {
    const mockSystemPrisma = {
      executeWithReason: vi
        .fn()
        .mockImplementation(async (_reason: string, cb: (client: unknown) => Promise<unknown>) => {
          const client = { user: { count: vi.fn().mockResolvedValue(0) } };
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
      license: {
        upsert: vi.fn(),
      },
    };

    const mockTenantDb = {
      withCompany: vi
        .fn()
        .mockImplementation(async (_cid: string, cb: (tx: unknown) => Promise<unknown>) => {
          return cb(mockTx);
        }),
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb(mockTx);
      }),
    } as unknown as TenantDb;

    const service = new LocalProvisioningService(
      mockSystemPrisma,
      mockTenantDb,
      mockProvisioningService,
      mockTokenService,
      mockConfigService,
    );

    const result = await service.provisionLocalStandalone({
      companyName: 'Acme Real Estate',
      companyCode: 'ACME01',
      adminEmail: 'admin@acme.local',
      adminName: 'Managing Director',
      adminPassword: 'Password123!',
      licenseKey: 'EXZA-ENTERPRISE-2026-ABCD-EF01-9999',
    });

    expect(result.provisioned).toBe(true);
    expect(result.companyId).toBe('comp-local-1');
    expect(result.tokens?.accessToken).toBe('test-access-token');
    expect(mockProvisioningService.provisionCompany).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme Real Estate',
        code: 'ACME01',
        managingDirector: expect.objectContaining({
          email: 'admin@acme.local',
          fullName: 'Managing Director',
          password: 'Password123!',
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
    expect(mockTx.license.upsert).toHaveBeenCalled();
  });

  it('throws BadRequestException when required fields are missing', async () => {
    const mockSystemPrisma = {
      executeWithReason: vi
        .fn()
        .mockImplementation(async (_reason: string, cb: (client: unknown) => Promise<unknown>) => {
          const client = { user: { count: vi.fn().mockResolvedValue(0) } };
          return cb(client);
        }),
    } as unknown as SystemPrisma;

    const service = new LocalProvisioningService(
      mockSystemPrisma,
      {} as TenantDb,
      {} as TenantProvisioningService,
      mockTokenService,
      mockConfigService,
    );

    await expect(service.provisionLocalStandalone({})).rejects.toThrow();
  });

  it('skips provisioning if company already exists (idempotency)', async () => {
    const existingCompany = {
      id: 'existing-comp-1',
      code: 'EXISTING',
      name: 'Existing Co',
      branches: [{ id: 'br-head' }],
      users: [{ id: 'usr-admin', email: 'admin@existing.local', fullName: 'Existing Admin' }],
    };

    const mockSystemPrisma = {
      executeWithReason: vi
        .fn()
        .mockImplementation(async (_reason: string, cb: (client: unknown) => Promise<unknown>) => {
          const client = {
            user: {
              count: vi.fn().mockResolvedValue(1),
            },
            company: {
              findFirst: vi.fn().mockResolvedValue(existingCompany),
            },
          };
          return cb(client);
        }),
    } as unknown as SystemPrisma;

    const mockProvisioningService = {
      provisionCompany: vi.fn(),
    } as unknown as TenantProvisioningService;

    const mockTenantDb = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({});
      }),
    } as unknown as TenantDb;

    const service = new LocalProvisioningService(
      mockSystemPrisma,
      mockTenantDb,
      mockProvisioningService,
      mockTokenService,
      mockConfigService,
    );

    const result = await service.provisionLocalStandalone();

    expect(result.provisioned).toBe(false);
    expect(result.companyId).toBe('existing-comp-1');
    expect(mockProvisioningService.provisionCompany).not.toHaveBeenCalled();
  });
});
