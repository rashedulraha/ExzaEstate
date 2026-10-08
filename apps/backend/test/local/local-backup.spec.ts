import fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { SystemPrisma } from '../../src/database/system-prisma.service.js';
import { LocalBackupService } from '../../src/modules/local-data/local-backup.service.js';
import { LocalExportService } from '../../src/modules/local-data/local-export.service.js';

describe('A10.3 — Local Data Lifecycle: Migrations, Backups, Restore, Export', () => {
  const testBackupDir = path.resolve(process.cwd(), '.test-local-backups');

  const mockDbSnapshot = {
    companies: [
      {
        id: 'comp-1',
        code: 'LOCAL01',
        name: 'Local Test Corp',
        timezone: 'Asia/Dhaka',
        isActive: true,
      },
    ],
    branches: [{ id: 'br-1', companyId: 'comp-1', name: 'Main', code: 'MAIN', isHeadOffice: true }],
    departments: [{ id: 'dep-1', companyId: 'comp-1', name: 'Admin', code: 'ADM' }],
    users: [{ id: 'usr-1', companyId: 'comp-1', email: 'admin@local.test', fullName: 'Admin' }],
    settings: [{ id: 'set-1', companyId: 'comp-1', key: 'single_user_auto_approve', value: true }],
    accounts: [
      {
        id: 'acc-1',
        companyId: 'comp-1',
        code: '1010',
        name: 'Cash',
        type: 'ASSET',
        currency: 'BDT',
      },
      {
        id: 'acc-2',
        companyId: 'comp-1',
        code: '4010',
        name: 'Sales Revenue',
        type: 'REVENUE',
        currency: 'BDT',
      },
    ],
    journals: [{ id: 'j-1', companyId: 'comp-1', journalNumber: 'J-001', status: 'POSTED' }],
    journalLines: [
      {
        id: 'jl-1',
        companyId: 'comp-1',
        journalId: 'j-1',
        lineNumber: 1,
        accountId: 'acc-1',
        debitPaisa: 50000000n,
        creditPaisa: 0n,
      },
      {
        id: 'jl-2',
        companyId: 'comp-1',
        journalId: 'j-1',
        lineNumber: 2,
        accountId: 'acc-2',
        debitPaisa: 0n,
        creditPaisa: 50000000n,
      },
    ],
    properties: [
      {
        id: 'prop-1',
        companyId: 'comp-1',
        unitNumber: 'A-101',
        status: 'AVAILABLE',
        basePricePaisa: 600000000n,
      },
      {
        id: 'prop-2',
        companyId: 'comp-1',
        unitNumber: 'B-201',
        status: 'SOLD',
        basePricePaisa: 400000000n,
      },
    ],
    customers: [{ id: 'cust-1', companyId: 'comp-1', fullName: 'Rahim Khan', status: 'ACTIVE' }],
    bookings: [
      {
        id: 'bk-1',
        companyId: 'comp-1',
        customerId: 'cust-1',
        status: 'CONFIRMED',
        totalPricePaisa: 400000000n,
        totalPaidPaisa: 150000000n,
      },
    ],
    installments: [],
    documents: [{ id: 'doc-1', companyId: 'comp-1', title: 'Sale Deed', currentVersion: 2 }],
    documentSequences: [
      {
        id: 'seq-1',
        companyId: 'comp-1',
        type: 'BOOKING',
        fiscalYear: '2026',
        scopeKey: 'ALL',
        lastValue: 42n,
      },
    ],
  };

  const mockSystemPrisma = {
    executeWithReason: vi
      .fn()
      .mockImplementation(
        async (_reason: string, callback: (client: unknown) => Promise<unknown>) => {
          const mockClient = {
            company: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.companies),
              findFirst: vi.fn().mockResolvedValue(mockDbSnapshot.companies[0]),
              findUnique: vi.fn().mockResolvedValue(mockDbSnapshot.companies[0]),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            branch: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.branches),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            department: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.departments),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            user: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.users),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            companySetting: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.settings),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            account: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.accounts),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            journal: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.journals),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            journalLine: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.journalLines),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            property: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.properties),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            customer: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.customers),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            booking: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.bookings),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            installment: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.installments),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            document: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.documents),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
            documentSequence: {
              findMany: vi.fn().mockResolvedValue(mockDbSnapshot.documentSequences),
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
          };
          return callback(mockClient);
        },
      ),
  } as unknown as SystemPrisma;

  let backupService: LocalBackupService;
  let exportService: LocalExportService;

  beforeAll(async () => {
    process.env.LOCAL_BACKUP_DIR = testBackupDir;
    backupService = new LocalBackupService(mockSystemPrisma);
    exportService = new LocalExportService(mockSystemPrisma);
    await fs.mkdir(testBackupDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(testBackupDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('creates a standalone backup bundle with SHA-256 checksum and manifest', async () => {
    const { backupId, filePath, manifest } = await backupService.createBackup({
      label: 'Test Backup',
    });

    expect(backupId).toBeDefined();
    expect(manifest.companyCode).toBe('LOCAL01');
    expect(manifest.checksum).toHaveLength(64);
    expect(manifest.tableCounts.companies).toBe(1);
    expect(manifest.tableCounts.properties).toBe(2);

    const exists = await fs.stat(filePath);
    expect(exists.isFile()).toBe(true);
  });

  it('prunes expired backups to keep at most 14 retained backups', async () => {
    for (let i = 0; i < 16; i++) {
      await backupService.createBackup({ label: `Batch ${i}` });
    }

    const files = await fs.readdir(testBackupDir);
    const backupFiles = files.filter((f) => f.endsWith('.exzabackup'));
    expect(backupFiles.length).toBeLessThanOrEqual(14);
  });

  it('warns when no backup exists or backup is >= 7 days old (standalone_backup_warn_days)', async () => {
    const status = await backupService.getBackupStatus();
    expect(status.hasWarning).toBe(false);
    expect(status.daysSinceLastBackup).toBe(0);
    expect(status.warnThresholdDays).toBe(7);

    // Empty folder check
    const emptyDir = path.resolve(process.cwd(), '.empty-backups');
    await fs.mkdir(emptyDir, { recursive: true });
    const emptyStatus = await backupService.getBackupStatus(emptyDir);
    expect(emptyStatus.hasWarning).toBe(true);
    expect(emptyStatus.warningMessage).toContain('Warning: No backup');
    await fs.rm(emptyDir, { recursive: true, force: true });
  });

  it('runSafeMigration automatically restores pre-upgrade backup when migration fails', async () => {
    let restoreCalled = false;
    const originalRestore = backupService.restoreBackup.bind(backupService);
    backupService.restoreBackup = async (fp: string) => {
      restoreCalled = true;
      return originalRestore(fp);
    };

    const failingMigration = async () => {
      throw new Error('Relation "properties" does not exist in migration SQL');
    };

    await expect(backupService.runSafeMigration(failingMigration)).rejects.toThrowError(
      BadRequestException,
    );
    expect(restoreCalled).toBe(true);
  });

  it('LocalExportService exports bundle (.exzaexport) with trial balance and AT-34 financial fidelity', async () => {
    const bundle = await exportService.exportCompanyBundle('comp-1');

    expect(bundle.manifest.company.code).toBe('LOCAL01');
    expect(bundle.manifest.trialBalance.totalDebitPaisa).toBe('50000000');
    expect(bundle.manifest.trialBalance.totalCreditPaisa).toBe('50000000');
    expect(bundle.manifest.inventoryStatus.totalUnits).toBe(2);
    expect(bundle.manifest.inventoryStatus.availableUnits).toBe(1);
    expect(bundle.manifest.inventoryStatus.soldUnits).toBe(1);
    expect(bundle.manifest.documentCounts.totalDocuments).toBe(1);
    expect(bundle.manifest.documentCounts.totalVersions).toBe(2);

    expect(bundle.csvData).toBeDefined();
    expect(bundle.csvData?.customers).toContain('Rahim Khan');
    expect(bundle.csvData?.properties).toContain('A-101');
  });
});
