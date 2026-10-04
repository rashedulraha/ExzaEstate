import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BudgetService } from './budget.service.js';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';

interface MockBudgetTx {
  expenseBudget: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

describe('BudgetService (A8.4 & AT-37)', () => {
  let service: BudgetService;
  let mockTenantDb: Partial<TenantDb>;
  let mockAuditService: Partial<AuditService>;
  let mockOutboxService: Partial<OutboxService>;
  let mockTx: MockBudgetTx;

  const companyId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const projectId = '00000000-0000-0000-0000-000000000010';
  const categoryId = '00000000-0000-0000-0000-000000000020';

  beforeEach(() => {
    mockTx = {
      expenseBudget: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_cid, cb) =>
        cb(mockTx as unknown as import('../../../database/tenant-prisma.js').TenantPrisma),
      ),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockOutboxService = {
      emit: vi.fn().mockResolvedValue({ id: 'event-1' }),
    };

    service = new BudgetService(
      mockTenantDb as TenantDb,
      mockAuditService as AuditService,
      mockOutboxService as OutboxService,
    );
  });

  describe('S1: Budget Creation & Retrieval', () => {
    it('creates a project budget and lists with calculated spend metrics', async () => {
      mockTx.expenseBudget.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'budget-1',
          ...data,
          actualSpendPaisa: 0n,
          alert70Sent: false,
          alert85Sent: false,
          alert100Sent: false,
          category: null,
        }),
      );

      const created = await service.createBudget(companyId, userId, {
        projectId,
        fiscalYear: '2026-2027',
        budgetAmountPaisa: '100000000', // ৳10,00,000
      });

      expect(created.budgetAmountPaisa).toBe(100_000_000n);
      expect(mockAuditService.record).toHaveBeenCalled();

      mockTx.expenseBudget.findMany.mockResolvedValue([
        {
          id: 'budget-1',
          budgetAmountPaisa: 100_000_000n,
          actualSpendPaisa: 30_000_000n, // 30% spend
          category: null,
        },
      ]);

      const list = await service.listBudgets(companyId, { fiscalYear: '2026-2027' });
      expect(list[0]?.remainingPaisa).toBe(70_000_000n);
      expect(list[0]?.spendPercentage).toBe(30);
    });
  });

  describe('S2 & S3 & AT-37: Spend Threshold Alerts (70%, 85%, 100%)', () => {
    it('triggers info alert at 70%, warning at 85%, critical at 100% exactly once each', async () => {
      const budgetState = {
        id: 'budget-1',
        companyId,
        projectId,
        categoryId,
        fiscalYear: '2026-2027',
        budgetAmountPaisa: 100_000_000n, // ৳10,00,000
        actualSpendPaisa: 0n,
        alert70Sent: false,
        alert85Sent: false,
        alert100Sent: false,
      };

      const txMock = mockTx as unknown as import('../../../database/tenant-prisma.js').TenantPrisma;

      // --- STEP 1: Spend reaches 70% (70,000,000 paisa) ---
      mockTx.expenseBudget.findMany.mockResolvedValue([budgetState]);
      mockTx.expenseBudget.update.mockImplementation(({ data }) => {
        Object.assign(budgetState, data);
        return Promise.resolve(budgetState);
      });

      await service.recordSpend(
        companyId,
        userId,
        { projectId, categoryId, amountPaisa: 70_000_000n },
        txMock,
      );

      expect(budgetState.actualSpendPaisa).toBe(70_000_000n);
      expect(budgetState.alert70Sent).toBe(true);
      expect(budgetState.alert85Sent).toBe(false);
      expect(budgetState.alert100Sent).toBe(false);

      expect(mockOutboxService.emit).toHaveBeenCalledWith(
        expect.anything(),
        'expense.budget.alert',
        expect.objectContaining({
          level: 'INFO',
          thresholdPercent: 70,
        }),
      );
      expect(mockOutboxService.emit).toHaveBeenCalledTimes(1);

      // --- STEP 2: Spend reaches 85% (+15,000,000 paisa -> 85,000,000 paisa) ---
      mockOutboxService.emit = vi.fn().mockResolvedValue({ id: 'event-2' });

      await service.recordSpend(
        companyId,
        userId,
        { projectId, categoryId, amountPaisa: 15_000_000n },
        txMock,
      );

      expect(budgetState.actualSpendPaisa).toBe(85_000_000n);
      expect(budgetState.alert70Sent).toBe(true);
      expect(budgetState.alert85Sent).toBe(true);
      expect(budgetState.alert100Sent).toBe(false);

      expect(mockOutboxService.emit).toHaveBeenCalledWith(
        expect.anything(),
        'expense.budget.alert',
        expect.objectContaining({
          level: 'WARNING',
          thresholdPercent: 85,
        }),
      );
      expect(mockOutboxService.emit).toHaveBeenCalledTimes(1);

      // --- STEP 3: Spend reaches 100% (+15,000,000 paisa -> 100,000,000 paisa) ---
      mockOutboxService.emit = vi.fn().mockResolvedValue({ id: 'event-3' });

      await service.recordSpend(
        companyId,
        userId,
        { projectId, categoryId, amountPaisa: 15_000_000n },
        txMock,
      );

      expect(budgetState.actualSpendPaisa).toBe(100_000_000n);
      expect(budgetState.alert70Sent).toBe(true);
      expect(budgetState.alert85Sent).toBe(true);
      expect(budgetState.alert100Sent).toBe(true);

      expect(mockOutboxService.emit).toHaveBeenCalledWith(
        expect.anything(),
        'expense.budget.alert',
        expect.objectContaining({
          level: 'CRITICAL',
          thresholdPercent: 100,
        }),
      );
      expect(mockOutboxService.emit).toHaveBeenCalledTimes(1);

      // --- STEP 4: Additional spend (+5,000,000 paisa) DOES NOT re-trigger any alert ---
      mockOutboxService.emit = vi.fn().mockResolvedValue({ id: 'event-4' });

      await service.recordSpend(
        companyId,
        userId,
        { projectId, categoryId, amountPaisa: 5_000_000n },
        txMock,
      );

      expect(budgetState.actualSpendPaisa).toBe(105_000_000n);
      // Zero outbox alerts emitted because 70, 85, 100 flags are all already true!
      expect(mockOutboxService.emit).not.toHaveBeenCalled();
    });
  });
});
