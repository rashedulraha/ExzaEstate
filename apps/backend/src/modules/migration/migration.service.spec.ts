import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '../../database/tenant-db.service.js';
import type { AuditService } from '../../platform/audit/audit.service.js';
import type { OutboxService } from '../../platform/outbox/outbox.service.js';
import type { SequenceService } from '../../platform/sequence/sequence.service.js';
import { MigrationService } from './migration.service.js';

interface MockTx {
  migrationBatch: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  account: {
    findMany: ReturnType<typeof vi.fn>;
  };
  journal: {
    create: ReturnType<typeof vi.fn>;
  };
  journalLine: {
    findMany: ReturnType<typeof vi.fn>;
  };
  legacyBookingRecord: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
}

describe('MigrationService (AT-29 & Phase A7.9)', () => {
  let service: MigrationService;
  let mockTenantDb: Partial<TenantDb>;
  let mockSequenceService: Partial<SequenceService>;
  let mockAuditService: Partial<AuditService>;
  let mockOutboxService: Partial<OutboxService>;
  let mockTx: MockTx;

  beforeEach(() => {
    mockTx = {
      migrationBatch: {
        create: vi
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'batch-1', ...args?.data, createdAt: new Date() }),
          ),
        findFirst: vi.fn(),
        update: vi
          .fn()
          .mockImplementation((args: { where: { id: string }; data: Record<string, unknown> }) =>
            Promise.resolve({
              id: args?.where?.id,
              batchNumber: 'MIG-2026-00001',
              goLiveDate: new Date('2026-07-01'),
              createdAt: new Date(),
              ...args?.data,
            }),
          ),
      },

      account: {
        findMany: vi.fn(),
      },
      journal: {
        create: vi
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'jrn-opn-1', ...args?.data }),
          ),
      },
      journalLine: {
        findMany: vi.fn(),
      },
      legacyBookingRecord: {
        create: vi
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'lbr-1', ...args?.data }),
          ),
        findMany: vi.fn(),
        count: vi.fn().mockResolvedValue(2),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_companyId, callback) =>
        callback(mockTx as unknown as Parameters<typeof callback>[0]),
      ),
    };

    mockSequenceService = {
      next: vi.fn().mockResolvedValue(1),
      format: vi.fn().mockReturnValue('MIG-2026-00001'),
    };

    mockAuditService = { record: vi.fn().mockResolvedValue(undefined) };
    mockOutboxService = { emit: vi.fn().mockResolvedValue(undefined) };

    service = new MigrationService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      mockOutboxService as OutboxService,
    );
  });

  it('rejects unbalanced opening balance journal', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = 'user-001';
    const batchId = 'batch-1';

    mockTx.migrationBatch.findFirst.mockResolvedValue({
      id: batchId,
      companyId,
      status: 'Draft',
      goLiveDate: new Date('2026-07-01'),
    });

    // Debit 100, Credit 80 (unbalanced)
    await expect(
      service.postOpeningBalance(companyId, userId, batchId, {
        lines: [
          { accountCode: '1100', debitPaisa: '100000000', creditPaisa: '0' },
          { accountCode: '3100', debitPaisa: '0', creditPaisa: '80000000' },
        ],
      }),
    ).rejects.toThrow(/unbalanced/i);
  });

  it('AT-29: Migration gate blocks finalize when Opening AR != Legacy Outstanding, lists differences per customer', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = 'user-001';
    const batchId = 'batch-gate';

    mockTx.migrationBatch.findFirst.mockResolvedValue({
      id: batchId,
      companyId,
      status: 'Draft',
      openingJournalId: 'jrn-opn-gate',
      batchNumber: 'MIG-2026-00001',
      goLiveDate: new Date('2026-07-01'),
    });

    // Opening AR for customer-1: ৳30,00,000 (300000000 paisa)
    mockTx.journalLine.findMany.mockResolvedValue([
      {
        partyId: 'cust-1',
        debitPaisa: 300000000n,
        creditPaisa: 0n,
      },
    ]);

    // Legacy booking outstanding for customer-1: ৳25,00,000 (250000000 paisa) -> Mismatch of ৳5,00,000
    mockTx.legacyBookingRecord.findMany.mockResolvedValue([
      {
        customerId: 'cust-1',
        outstandingPaisa: 250000000n,
        customer: { fullName: 'Rahim Chowdhury' },
      },
    ]);

    // 1. Reconciliation gate reports mismatch and cannot finalize
    const gate = await service.getReconciliationGate(companyId, batchId);
    expect(gate.canFinalize).toBe(false);
    expect(gate.totalOpeningArPaisa).toBe('300000000');
    expect(gate.totalLegacyOutstandingPaisa).toBe('250000000');
    expect(gate.differencePaisa).toBe('50000000');
    expect(gate.differenceFormatted).toBe('BDT 5,00,000.00');

    expect(gate.customerDifferences).toHaveLength(1);
    expect(gate.customerDifferences[0]?.customerId).toBe('cust-1');
    expect(gate.customerDifferences[0]?.isReconciled).toBe(false);
    expect(gate.customerDifferences[0]?.differencePaisa).toBe('50000000');

    // 2. Finalize attempt is blocked without approved adjustment
    await expect(service.finalizeBatch(companyId, userId, batchId)).rejects.toThrow(
      /reconciliation gate failed/i,
    );
  });

  it('AT-29: Finalizes and locks batch when Opening AR == Legacy Outstanding (difference = ৳0.00)', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = 'user-001';
    const batchId = 'batch-ok';

    mockTx.migrationBatch.findFirst.mockResolvedValue({
      id: batchId,
      companyId,
      status: 'Draft',
      openingJournalId: 'jrn-opn-ok',
      batchNumber: 'MIG-2026-00002',
      goLiveDate: new Date('2026-07-01'),
    });

    // Opening AR: ৳30,00,000
    mockTx.journalLine.findMany.mockResolvedValue([
      { partyId: 'cust-1', debitPaisa: 300000000n, creditPaisa: 0n },
    ]);

    // Legacy booking outstanding: ৳30,00,000
    mockTx.legacyBookingRecord.findMany.mockResolvedValue([
      {
        customerId: 'cust-1',
        outstandingPaisa: 300000000n,
        customer: { fullName: 'Rahim Chowdhury' },
      },
    ]);

    const result = await service.finalizeBatch(companyId, userId, batchId);

    expect(result.status).toBe('Finalized');
    expect(mockTx.migrationBatch.update).toHaveBeenCalledWith({
      where: { id: batchId },
      data: expect.objectContaining({ status: 'Finalized' }),
    });
    expect(mockAuditService.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ action: 'MIGRATION_BATCH_FINALIZED' }),
    );
    expect(mockOutboxService.emit).toHaveBeenCalledWith(
      mockTx,
      'migration.batch_finalized',
      expect.objectContaining({ batchId }),
    );
  });

  it('AT-29: Finalizes with approved adjustment documented when mismatch exists', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = 'user-001';
    const batchId = 'batch-adj';

    mockTx.migrationBatch.findFirst.mockResolvedValue({
      id: batchId,
      companyId,
      status: 'Draft',
      openingJournalId: 'jrn-opn-adj',
      batchNumber: 'MIG-2026-00003',
      goLiveDate: new Date('2026-07-01'),
    });

    mockTx.journalLine.findMany.mockResolvedValue([
      { partyId: 'cust-1', debitPaisa: 300000000n, creditPaisa: 0n },
    ]);

    mockTx.legacyBookingRecord.findMany.mockResolvedValue([
      {
        customerId: 'cust-1',
        outstandingPaisa: 299950000n, // ৳500 rounding difference
        customer: { fullName: 'Rahim Chowdhury' },
      },
    ]);

    const result = await service.finalizeBatch(companyId, userId, batchId, {
      approvedAdjustmentReason: 'Approved ৳500 historical rounding difference write-off by MD',
    });

    expect(result.status).toBe('Finalized');
    expect(mockAuditService.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        action: 'MIGRATION_BATCH_FINALIZED',
        after: expect.objectContaining({
          approvedAdjustmentReason: 'Approved ৳500 historical rounding difference write-off by MD',
        }),
      }),
    );
  });
});
