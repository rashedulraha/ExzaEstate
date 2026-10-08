import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { CollectionReportQuery } from '../reports/queries/kpi/collection-report.query.js';
import { InventoryReportQuery } from '../reports/queries/kpi/inventory-report.query.js';
import { ManagementKpiQuery } from '../reports/queries/kpi/management-kpi.query.js';
import { SalesReportQuery } from '../reports/queries/kpi/sales-report.query.js';
import { DashboardService } from './dashboard.service.js';

describe('Management Dashboard KPIs & Reports (A9.3 / AT-15)', () => {
  let dashboardService: DashboardService;
  let kpiQuery: ManagementKpiQuery;
  let salesReportQuery: SalesReportQuery;
  let collectionReportQuery: CollectionReportQuery;
  let inventoryReportQuery: InventoryReportQuery;
  let mockTenantDb: Partial<TenantDb>;
  let mockPrisma: {
    booking: { findMany: ReturnType<typeof vi.fn> };
    payment: { findMany: ReturnType<typeof vi.fn> };
    installment: { findMany: ReturnType<typeof vi.fn> };
    account: { findMany: ReturnType<typeof vi.fn> };
    property: { findMany: ReturnType<typeof vi.fn> };
    lead: { count: ReturnType<typeof vi.fn> };
    user: { findMany: ReturnType<typeof vi.fn> };
    customer: { findMany: ReturnType<typeof vi.fn> };
    project: { findMany: ReturnType<typeof vi.fn> };
  };

  const companyId = '00000000-0000-0000-0000-000000000001';
  const exec1Id = '00000000-0000-0000-0000-000000000010';
  const exec2Id = '00000000-0000-0000-0000-000000000020';

  beforeEach(() => {
    mockPrisma = {
      booking: { findMany: vi.fn() },
      payment: { findMany: vi.fn() },
      installment: { findMany: vi.fn() },
      account: { findMany: vi.fn() },
      property: { findMany: vi.fn() },
      lead: { count: vi.fn() },
      user: { findMany: vi.fn() },
      customer: { findMany: vi.fn() },
      project: { findMany: vi.fn() },
    };

    mockTenantDb = {
      withCompany: vi
        .fn()
        .mockImplementation((_cid, cb) => cb(mockPrisma as unknown as TenantPrisma)),
    };

    kpiQuery = new ManagementKpiQuery(mockTenantDb as TenantDb);
    salesReportQuery = new SalesReportQuery(mockTenantDb as TenantDb);
    collectionReportQuery = new CollectionReportQuery(mockTenantDb as TenantDb);
    inventoryReportQuery = new InventoryReportQuery(mockTenantDb as TenantDb);
    dashboardService = new DashboardService(kpiQuery);
  });

  it('AT-15: Every dashboard KPI exactly equals the matching report for the same filters', async () => {
    // 1. Sales: Two confirmed bookings: ৳50,00,000 and ৳75,00,000 = ৳1,25,00,000
    const mockBookings = [
      {
        id: 'b-1',
        bookingNumber: 'BKG-001',
        propertyId: 'p-1',
        customerId: 'c-1',
        netPricePaisa: 500000000n,
        totalPaidPaisa: 100000000n,
        salesExecutiveId: exec1Id,
        confirmedAt: new Date('2026-10-01'),
        bookingDate: new Date('2026-10-01'),
      },
      {
        id: 'b-2',
        bookingNumber: 'BKG-002',
        propertyId: 'p-2',
        customerId: 'c-2',
        netPricePaisa: 750000000n,
        totalPaidPaisa: 250000000n,
        salesExecutiveId: exec2Id,
        confirmedAt: new Date('2026-10-02'),
        bookingDate: new Date('2026-10-02'),
      },
    ];

    // 2. Collection: Two payments: ৳10,00,000 and ৳25,00,000 = ৳35,00,000
    const mockPayments = [
      {
        id: 'pay-1',
        paymentNumber: 'PAY-001',
        amountPaisa: 100000000n,
        paymentMethod: 'BANK',
        paymentType: 'BOOKING_MONEY',
        paymentDate: new Date('2026-10-01'),
        postedAt: new Date('2026-10-01'),
        customer: { name: 'Customer A' },
        receipt: { receiptNumber: 'MR-001' },
      },
      {
        id: 'pay-2',
        paymentNumber: 'PAY-002',
        amountPaisa: 250000000n,
        paymentMethod: 'CHEQUE',
        paymentType: 'DOWN_PAYMENT',
        paymentDate: new Date('2026-10-02'),
        postedAt: new Date('2026-10-02'),
        customer: { name: 'Customer B' },
        receipt: { receiptNumber: 'MR-002' },
      },
    ];

    // 3. Properties: 1 Available (50m), 1 Booked (75m)
    const mockProperties = [
      {
        id: 'p-1',
        code: 'P-101',
        projectId: 'proj-1',
        status: 'Available',
        type: 'Apartment',
        areaSqft: 1500,
        netPricePaisa: 500000000n,
      },
      {
        id: 'p-2',
        code: 'P-102',
        projectId: 'proj-1',
        status: 'Booked',
        type: 'Apartment',
        areaSqft: 2000,
        netPricePaisa: 750000000n,
      },
    ];

    mockPrisma.booking.findMany.mockResolvedValue(mockBookings);
    mockPrisma.payment.findMany.mockResolvedValue(mockPayments);
    mockPrisma.installment.findMany.mockResolvedValue([]);
    mockPrisma.account.findMany.mockResolvedValue([
      { code: '1100', balancePaisa: 900000000n },
      { code: '2100', balancePaisa: 200000000n },
      { code: '1010', balancePaisa: 350000000n },
      { code: '5100', balancePaisa: 150000000n },
    ]);
    mockPrisma.property.findMany.mockResolvedValue(mockProperties);
    mockPrisma.lead.count.mockResolvedValue(10);
    mockPrisma.customer.findMany.mockResolvedValue([
      { id: 'c-1', name: 'Customer A' },
      { id: 'c-2', name: 'Customer B' },
    ]);
    mockPrisma.project.findMany.mockResolvedValue([{ id: 'proj-1', name: 'Gulshan Enclave' }]);
    mockPrisma.user.findMany.mockResolvedValue([
      { id: exec1Id, fullName: 'Executive 1' },
      { id: exec2Id, fullName: 'Executive 2' },
    ]);

    const filter = { startDate: '2026-10-01', endDate: '2026-10-31' };

    // Dashboard query
    const dashboardKpi = await dashboardService.getSummary(companyId, filter);

    // Matching reports
    const salesReport = await salesReportQuery.execute(companyId, filter);
    const collectionReport = await collectionReportQuery.execute(companyId, filter);
    const inventoryReport = await inventoryReportQuery.execute(companyId, filter);

    // ASSERTION AT-15: Dashboard KPI === Report summary
    expect(dashboardKpi.totalSalesPaisa).toBe(salesReport.summary.totalSalesPaisa);
    expect(dashboardKpi.totalSalesCount).toBe(salesReport.summary.totalSalesCount);

    expect(dashboardKpi.totalCollectionPaisa).toBe(collectionReport.summary.totalCollectionPaisa);
    expect(dashboardKpi.totalCollectionCount).toBe(collectionReport.summary.totalCollectionCount);

    expect(dashboardKpi.inventory.totalUnits).toBe(inventoryReport.summary.totalUnits);
    expect(dashboardKpi.inventory.availableUnits).toBe(inventoryReport.summary.availableUnits);
    expect(dashboardKpi.inventory.totalInventoryValuePaisa).toBe(
      inventoryReport.summary.totalInventoryValuePaisa,
    );
  });

  it('BR-14: Excludes transferred successor bookings and cancelled bookings from sales count', async () => {
    mockPrisma.booking.findMany.mockImplementation(
      (args: { where: { isTransfer?: boolean; status?: { in?: string[] } } }) => {
        // Assert that query strictly filters isTransfer = false and only confirmed/active statuses
        expect(args.where.isTransfer).toBe(false);
        expect(args.where.status?.in).not.toContain('CANCELLED');
        return Promise.resolve([]);
      },
    );

    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.installment.findMany.mockResolvedValue([]);
    mockPrisma.account.findMany.mockResolvedValue([]);
    mockPrisma.property.findMany.mockResolvedValue([]);
    mockPrisma.lead.count.mockResolvedValue(0);

    await dashboardService.getSummary(companyId, {});
    expect(mockPrisma.booking.findMany).toHaveBeenCalled();
  });

  it('Scope-aware filtering: Filters by salesExecutiveId when user scope is OWN', async () => {
    mockPrisma.booking.findMany.mockImplementation(
      (args: { where: { salesExecutiveId?: string } }) => {
        expect(args.where.salesExecutiveId).toBe(exec1Id);
        return Promise.resolve([]);
      },
    );

    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.installment.findMany.mockResolvedValue([]);
    mockPrisma.account.findMany.mockResolvedValue([]);
    mockPrisma.property.findMany.mockResolvedValue([]);
    mockPrisma.lead.count.mockResolvedValue(0);

    await dashboardService.getSummary(companyId, {}, { scope: 'OWN', userId: exec1Id });

    expect(mockPrisma.booking.findMany).toHaveBeenCalled();
  });

  it('Salesperson Performance: aggregates confirmed bookings, collection, and lead conversion per executive', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: exec1Id, fullName: 'Karim Executive' }]);

    mockPrisma.booking.findMany.mockResolvedValue([{ netPricePaisa: 500000000n }]);

    mockPrisma.payment.findMany.mockResolvedValue([{ amountPaisa: 100000000n }]);

    mockPrisma.lead.count
      .mockResolvedValueOnce(20) // 20 assigned
      .mockResolvedValueOnce(5); // 5 converted

    const performance = await dashboardService.getSalesPerformance(companyId, {});

    expect(performance).toHaveLength(1);
    expect(performance[0]?.salesExecutiveName).toBe('Karim Executive');
    expect(performance[0]?.confirmedBookingsCount).toBe(1);
    expect(performance[0]?.totalSalesValuePaisa).toBe('500000000');
    expect(performance[0]?.totalCollectedPaisa).toBe('100000000');
    expect(performance[0]?.leadsAssignedCount).toBe(20);
    expect(performance[0]?.leadsConvertedCount).toBe(5);
    expect(performance[0]?.conversionRatePercent).toBe(25); // 5 / 20 * 100 = 25%
  });
});
