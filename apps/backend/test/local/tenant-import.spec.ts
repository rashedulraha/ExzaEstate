import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { SystemPrisma } from '../../src/database/system-prisma.service.js';
import type { ExzaExportBundle } from '../../src/modules/local-data/local-export.service.js';
import { TenantImportService } from '../../src/modules/system-admin/tenant-import.service.js';

describe('A10.4 — Local to Cloud Export/Import Pipeline (AT-34)', () => {
  const sampleBundle: ExzaExportBundle = {
    manifest: {
      schemaVersion: '1.0.0',
      exportedAt: '2026-10-05T00:00:00.000Z',
      company: {
        id: 'c0000000-0000-0000-0000-000000000001',
        code: 'STANDALONE01',
        name: 'Standalone Company Ltd',
        timezone: 'Asia/Dhaka',
      },
      tableCounts: {
        companies: 1,
        branches: 1,
        departments: 1,
        users: 1,
        settings: 1,
        accounts: 2,
        properties: 2,
        customers: 1,
        bookings: 1,
        installments: 0,
        journals: 1,
        journalLines: 2,
        documents: 1,
        sequences: 1,
      },
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // will set accurately in helper
      trialBalance: {
        totalDebitPaisa: '15000000000',
        totalCreditPaisa: '15000000000',
        accountCount: 2,
      },
      perCustomerAr: [{ customerId: 'cust-1', outstandingPaisa: '400000000' }],
      inventoryStatus: {
        totalUnits: 2,
        availableUnits: 1,
        bookedUnits: 0,
        soldUnits: 1,
        totalInventoryValuePaisa: '100000000000',
      },
      documentCounts: {
        totalDocuments: 1,
        totalVersions: 1,
      },
      sequences: { BOOKING: 105 },
    },
    tables: {
      companies: [
        {
          id: 'c0000000-0000-0000-0000-000000000001',
          code: 'STANDALONE01',
          name: 'Standalone Company Ltd',
          timezone: 'Asia/Dhaka',
        },
      ],
      branches: [
        { id: 'b1', companyId: 'c0000000-0000-0000-0000-000000000001', code: 'MAIN', name: 'Main' },
      ],
      departments: [
        {
          id: 'd1',
          companyId: 'c0000000-0000-0000-0000-000000000001',
          code: 'SALES',
          name: 'Sales',
        },
      ],
      users: [
        {
          id: 'u1',
          companyId: 'c0000000-0000-0000-0000-000000000001',
          email: 'director@standalone.internal',
          fullName: 'Director',
        },
      ],
      settings: [
        {
          id: 's1',
          companyId: 'c0000000-0000-0000-0000-000000000001',
          key: 'single_user_auto_approve',
          value: true,
        },
      ],
      accounts: [
        {
          id: 'a1',
          companyId: 'c0000000-0000-0000-0000-000000000001',
          code: '1010',
          name: 'Cash',
          type: 'ASSET',
        },
        {
          id: 'a2',
          companyId: 'c0000000-0000-0000-0000-000000000001',
          code: '4010',
          name: 'Revenue',
          type: 'REVENUE',
        },
      ],
      properties: [
        {
          id: 'p1',
          companyId: 'c0000000-0000-0000-0000-000000000001',
          unitNumber: '101',
          status: 'AVAILABLE',
          basePricePaisa: '50000000000',
        },
        {
          id: 'p2',
          companyId: 'c0000000-0000-0000-0000-000000000001',
          unitNumber: '102',
          status: 'SOLD',
          basePricePaisa: '50000000000',
        },
      ],
      customers: [
        { id: 'cust-1', companyId: 'c0000000-0000-0000-0000-000000000001', fullName: 'Customer A' },
      ],
      bookings: [
        {
          id: 'bk-1',
          companyId: 'c0000000-0000-0000-0000-000000000001',
          customerId: 'cust-1',
          totalPricePaisa: '1000000000',
          totalPaidPaisa: '600000000',
        },
      ],
      installments: [],
      journals: [
        { id: 'j-1', companyId: 'c0000000-0000-0000-0000-000000000001', journalNumber: 'J-01' },
      ],
      journalLines: [
        {
          id: 'jl-1',
          companyId: 'c0000000-0000-0000-0000-000000000001',
          journalId: 'j-1',
          debitPaisa: '15000000000',
          creditPaisa: '0',
        },
        {
          id: 'jl-2',
          companyId: 'c0000000-0000-0000-0000-000000000001',
          journalId: 'j-1',
          debitPaisa: '0',
          creditPaisa: '15000000000',
        },
      ],
      documents: [
        { id: 'doc-1', companyId: 'c0000000-0000-0000-0000-000000000001', title: 'Contract' },
      ],
    },
  };

  function createValidBundle(): ExzaExportBundle {
    const bundle = JSON.parse(JSON.stringify(sampleBundle)) as ExzaExportBundle;
    // Restore BigInts
    bundle.tables.journalLines = [
      {
        id: 'jl-1',
        companyId: bundle.manifest.company.id,
        journalId: 'j-1',
        debitPaisa: 15000000000n,
        creditPaisa: 0n,
      },
      {
        id: 'jl-2',
        companyId: bundle.manifest.company.id,
        journalId: 'j-1',
        debitPaisa: 0n,
        creditPaisa: 15000000000n,
      },
    ];
    const rawData = JSON.stringify(bundle.tables, (_k, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    );
    bundle.manifest.checksum = crypto.createHash('sha256').update(rawData).digest('hex');
    return bundle;
  }

  it('rejects bundle with corrupted checksum', async () => {
    const mockPrisma = {} as unknown as SystemPrisma;
    const service = new TenantImportService(mockPrisma);
    const bundle = createValidBundle();
    bundle.manifest.checksum = 'bad_checksum_0000000000000000000000000000000000000000000000000000';

    await expect(service.importTenant(bundle)).rejects.toThrowError(BadRequestException);
  });

  it('pre-flight check blocks import if a user email conflicts with an existing cloud user', async () => {
    const mockPrisma = {
      executeWithReason: vi
        .fn()
        .mockImplementation(async (_reason: string, cb: (client: unknown) => Promise<unknown>) => {
          const client = {
            user: {
              findMany: vi.fn().mockResolvedValue([{ email: 'director@standalone.internal' }]),
            },
          };
          return cb(client);
        }),
    } as unknown as SystemPrisma;

    const service = new TenantImportService(mockPrisma);
    const bundle = createValidBundle();

    await expect(service.importTenant(bundle)).rejects.toThrowError(ConflictException);
  });

  it('successfully imports bundle, verifies AT-34 financial fidelity, and flips tenant to ACTIVE', async () => {
    const client = {
      $executeRawUnsafe: vi.fn(),
      company: {
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      branch: { create: vi.fn(), deleteMany: vi.fn() },
      department: { create: vi.fn(), deleteMany: vi.fn() },
      user: {
        findMany: vi.fn().mockResolvedValue([]), // No email conflict
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      companySetting: { create: vi.fn(), deleteMany: vi.fn() },
      account: { create: vi.fn(), deleteMany: vi.fn() },
      property: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([
          { id: 'p1', status: 'AVAILABLE' },
          { id: 'p2', status: 'SOLD' },
        ]),
        deleteMany: vi.fn(),
      },
      customer: { create: vi.fn(), deleteMany: vi.fn() },
      booking: { create: vi.fn(), deleteMany: vi.fn() },
      installment: { create: vi.fn(), deleteMany: vi.fn() },
      journal: { create: vi.fn(), deleteMany: vi.fn() },
      journalLine: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([
          { debitPaisa: 15000000000n, creditPaisa: 0n },
          { debitPaisa: 0n, creditPaisa: 15000000000n },
        ]),
        deleteMany: vi.fn(),
      },
      document: {
        create: vi.fn(),
        count: vi.fn().mockResolvedValue(1),
        deleteMany: vi.fn(),
      },
      documentSequence: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    };

    const mockPrisma = {
      executeWithReason: vi
        .fn()
        .mockImplementation(async (_reason: string, cb: (c: unknown) => Promise<unknown>) => {
          return cb(client);
        }),
    } as unknown as SystemPrisma;

    const service = new TenantImportService(mockPrisma);
    const bundle = createValidBundle();

    const result = await service.importTenant(bundle);

    expect(result.status).toBe('ACTIVE');
    expect(result.companyCode).toBe('STANDALONE01');
    expect(client.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('app.import_mode'),
    );
    expect(client.company.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: true } }),
    );
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'IMPORT_COMPLETED' }),
      }),
    );
  });

  it('fails validation and deletes half-built tenant if trial balance does not reconcile', async () => {
    const client = {
      $executeRawUnsafe: vi.fn(),
      company: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
      branch: { create: vi.fn(), deleteMany: vi.fn() },
      department: { create: vi.fn(), deleteMany: vi.fn() },
      user: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), deleteMany: vi.fn() },
      companySetting: { create: vi.fn(), deleteMany: vi.fn() },
      account: { create: vi.fn(), deleteMany: vi.fn() },
      property: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
      customer: { create: vi.fn(), deleteMany: vi.fn() },
      booking: { create: vi.fn(), deleteMany: vi.fn() },
      installment: { create: vi.fn(), deleteMany: vi.fn() },
      journal: { create: vi.fn(), deleteMany: vi.fn() },
      journalLine: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([
          // Mismatched debit / credit
          { debitPaisa: 15000000000n, creditPaisa: 0n },
          { debitPaisa: 0n, creditPaisa: 14000000000n },
        ]),
        deleteMany: vi.fn(),
      },
      document: { create: vi.fn(), count: vi.fn().mockResolvedValue(1), deleteMany: vi.fn() },
      documentSequence: { upsert: vi.fn(), deleteMany: vi.fn() },
      auditLog: { create: vi.fn() },
    };

    const mockPrisma = {
      executeWithReason: vi
        .fn()
        .mockImplementation(async (_reason: string, cb: (c: unknown) => Promise<unknown>) => {
          return cb(client);
        }),
    } as unknown as SystemPrisma;

    const service = new TenantImportService(mockPrisma);
    const bundle = createValidBundle();

    await expect(service.importTenant(bundle)).rejects.toThrowError(BadRequestException);
    expect(client.company.deleteMany).toHaveBeenCalled();
  });
});
