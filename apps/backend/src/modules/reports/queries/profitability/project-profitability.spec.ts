import { describe, expect, it, vi, beforeEach } from 'vitest';
import { calculateCostOfLandSold } from './cost-of-land-sold.calculator.js';
import { aggregateProjectFinancials } from './project-profitability.helper.js';
import { ProjectProfitabilityQuery } from './project-profitability.query.js';
import type { TenantDb } from '../../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../../database/tenant-prisma.js';

describe('Project Profitability Report & Allocation (A8.6)', () => {
  describe('calculateCostOfLandSold (accounting-rules.md §3.10)', () => {
    it('returns 0n when sqFtSold is 0 or negative', () => {
      const res = calculateCostOfLandSold({
        sqFtSold: 0,
        totalSaleableSqFt: 10000,
        projectWipBalancePaisa: 500000000n,
      });
      expect(res).toBe(0n);
    });

    it('returns 0n when totalSaleableSqFt is 0 or negative', () => {
      const res = calculateCostOfLandSold({
        sqFtSold: 1000,
        totalSaleableSqFt: 0,
        projectWipBalancePaisa: 500000000n,
      });
      expect(res).toBe(0n);
    });

    it('returns 0n when projectWipBalancePaisa is 0 or negative', () => {
      const res = calculateCostOfLandSold({
        sqFtSold: 1000,
        totalSaleableSqFt: 10000,
        projectWipBalancePaisa: 0n,
      });
      expect(res).toBe(0n);
    });

    it('allocates full WIP when sqFtSold >= totalSaleableSqFt', () => {
      const res = calculateCostOfLandSold({
        sqFtSold: 12000,
        totalSaleableSqFt: 10000,
        projectWipBalancePaisa: 500000000n,
      });
      expect(res).toBe(500000000n);
    });

    it('allocates proportionally according to (sq ft sold ÷ total saleable sq ft) × WIP', () => {
      // 2,500 sq ft out of 10,000 sq ft = 25% of ৳1,00,00,000 (100,000,000 paisa) = ৳25,00,000 (25,000,000 paisa)
      const res = calculateCostOfLandSold({
        sqFtSold: 2500,
        totalSaleableSqFt: 10000,
        projectWipBalancePaisa: 100000000n,
      });
      expect(res).toBe(25000000n);
    });

    it('handles precise allocation with basis point accuracy', () => {
      // 3,333 sq ft out of 10,000 sq ft = 33.33% = 3333 bps
      // 100,000,000 * 3333 / 10000 = 33,330,000
      const res = calculateCostOfLandSold({
        sqFtSold: 3333,
        totalSaleableSqFt: 10000,
        projectWipBalancePaisa: 100000000n,
      });
      expect(res).toBe(33330000n);
    });
  });

  describe('aggregateProjectFinancials', () => {
    it('accurately categorizes revenues and costs and calculates net profit and margin', () => {
      const lines = [
        // Revenue (Account 4100): Credit ৳50,00,000 (5,000,000,00 paisa)
        { accountCode: '4100', debitPaisa: 0n, creditPaisa: 500000000n },
        // Land cost (Account 5100): Debit ৳15,00,000
        { accountCode: '5100', debitPaisa: 150000000n, creditPaisa: 0n },
        // Development cost (Account 5200): Debit ৳10,00,000
        { accountCode: '5200', debitPaisa: 100000000n, creditPaisa: 0n },
        // Marketing cost (Account 5300): Debit ৳3,00,000
        { accountCode: '5300', debitPaisa: 30000000n, creditPaisa: 0n },
        // Commission cost (Account 5400): Debit ৳2,00,000
        { accountCode: '5400', debitPaisa: 20000000n, creditPaisa: 0n },
        // Admin cost (Account 5500): Debit ৳1,00,000
        { accountCode: '5500', debitPaisa: 10000000n, creditPaisa: 0n },
        // Other cost (Account 5900): Debit ৳50,000
        { accountCode: '5900', debitPaisa: 5000000n, creditPaisa: 0n },
      ];

      const item = aggregateProjectFinancials(
        'proj-1',
        'PRJ-001',
        'Gulshan Heights',
        lines,
        350000000n, // Estimated budget: ৳35,00,000
      );

      // Total Cost = 15m + 10m + 3m + 2m + 1m + 0.5m = 31.5m (315,000,000 paisa = ৳31,50,000)
      expect(item.costBreakdown.landCostPaisa).toBe('150000000');
      expect(item.costBreakdown.developmentCostPaisa).toBe('100000000');
      expect(item.costBreakdown.marketingCostPaisa).toBe('50000000'); // 30m + 20m
      expect(item.costBreakdown.adminCostPaisa).toBe('10000000');
      expect(item.costBreakdown.otherCostPaisa).toBe('5000000');
      expect(item.totalCostPaisa).toBe('315000000');

      // Total Revenue = 50m (500,000,000 paisa)
      expect(item.totalRevenuePaisa).toBe('500000000');

      // Net Profit = 50m - 31.5m = 18.5m (185,000,000 paisa)
      expect(item.netProfitPaisa).toBe('185000000');
      expect(item.isProfitable).toBe(true);

      // Margin % = (18.5 / 50) * 100 = 37%
      expect(item.profitMarginPercent).toBe(37);

      // Budget Variance = 35m - 31.5m = 3.5m favorable
      expect(item.budgetVariancePaisa).toBe('35000000');
    });

    it('identifies loss-making projects and zero revenue edge cases', () => {
      const lines = [
        // Cost of land sold: Debit ৳20,00,000
        { accountCode: '5100', debitPaisa: 200000000n, creditPaisa: 0n },
      ];

      const item = aggregateProjectFinancials(
        'proj-2',
        'PRJ-002',
        'Banani Lakeview',
        lines,
        null,
      );

      expect(item.totalRevenuePaisa).toBe('0');
      expect(item.totalCostPaisa).toBe('200000000');
      expect(item.netProfitPaisa).toBe('-200000000');
      expect(item.profitMarginPercent).toBe(0);
      expect(item.isProfitable).toBe(false);
      expect(item.budgetVariancePaisa).toBeNull();
    });
  });

  describe('ProjectProfitabilityQuery.execute', () => {
    let query: ProjectProfitabilityQuery;
    let mockTenantDb: Partial<TenantDb>;
    let mockPrisma: {
      project: { findMany: ReturnType<typeof vi.fn> };
      journalLine: { findMany: ReturnType<typeof vi.fn> };
    };

    const companyId = '00000000-0000-0000-0000-000000000001';

    beforeEach(() => {
      mockPrisma = {
        project: { findMany: vi.fn() },
        journalLine: { findMany: vi.fn() },
      };

      mockTenantDb = {
        withCompany: vi.fn().mockImplementation((_cid, callback) =>
          callback(mockPrisma as unknown as TenantPrisma),
        ),
      };

      query = new ProjectProfitabilityQuery(mockTenantDb as TenantDb);
    });

    it('reconciles project profitability across multiple projects and summarizes portfolio', async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'p-1',
          code: 'PRJ-1',
          name: 'Project Alpha',
          costCenter: { code: 'CC-P1' },
          estimatedBudgetPaisa: 400000000n,
        },
        {
          id: 'p-2',
          code: 'PRJ-2',
          name: 'Project Beta',
          costCenter: { code: 'CC-P2' },
          estimatedBudgetPaisa: null,
        },
      ]);

      mockPrisma.journalLine.findMany
        .mockResolvedValueOnce([
          // Project Alpha: ৳1,00,00,000 revenue, ৳60,00,000 cost -> ৳40,00,000 profit
          { account: { code: '4100' }, debitPaisa: 0n, creditPaisa: 1000000000n },
          { account: { code: '5100' }, debitPaisa: 600000000n, creditPaisa: 0n },
        ])
        .mockResolvedValueOnce([
          // Project Beta: ৳20,00,000 revenue, ৳30,00,000 cost -> -৳10,00,000 loss
          { account: { code: '4100' }, debitPaisa: 0n, creditPaisa: 200000000n },
          { account: { code: '5200' }, debitPaisa: 300000000n, creditPaisa: 0n },
        ]);

      const result = await query.execute(companyId, {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });

      expect(result.projects).toHaveLength(2);
      expect(result.summary.totalRevenuePaisa).toBe('1200000000'); // 10m + 2m
      expect(result.summary.totalCostPaisa).toBe('900000000'); // 6m + 3m
      expect(result.summary.totalProfitPaisa).toBe('300000000'); // 4m - 1m = 3m
      expect(result.summary.profitableProjectsCount).toBe(1);
      expect(result.summary.lossMakingProjectsCount).toBe(1);
      // Margin: 300,000,000 / 1,200,000,000 = 25%
      expect(result.summary.overallMarginPercent).toBe(25);
    });

    it('filters by specific project ID when provided in query dto', async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'p-1',
          code: 'PRJ-1',
          name: 'Project Alpha',
          costCenter: null,
          estimatedBudgetPaisa: null,
        },
      ]);
      mockPrisma.journalLine.findMany.mockResolvedValue([]);

      const result = await query.execute(companyId, { projectId: 'p-1' });

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: {
          companyId,
          deletedAt: null,
          id: 'p-1',
        },
        include: { costCenter: true },
        orderBy: { name: 'asc' },
      });
      expect(result.projects).toHaveLength(1);
    });
  });
});
