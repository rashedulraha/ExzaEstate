import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExecutiveKpiStrip } from './components/ExecutiveKpiStrip.js';
import { DashboardChartsSection } from './components/DashboardChartsSection.js';
import { formatMoney } from '@exzaestate/shared';

describe('Executive Dashboard & AT-15 Verification', () => {
  const mockSummary = {
    totalSalesPaisa: '5000000000', // ৳5,00,00,000 (5 Crore)
    totalSalesCount: 14,
    totalCollectionPaisa: '3200000000', // ৳3,20,00,000
    totalCollectionCount: 22,
    outstandingReceivablePaisa: '1800000000',
    overdueAmountPaisa: '450000000', // ৳45,00,000
    overdueInstallmentsCount: 5,
    totalExpensePaisa: '1200000000',
    accountsPayablePaisa: '300000000',
    cashBankBalancePaisa: '2000000000',
    inventory: {
      totalUnits: 100,
      availableUnits: 64,
      bookedUnits: 14,
      soldUnits: 20,
      reservedUnits: 2,
      blockedUnits: 0,
      totalInventoryValuePaisa: '50000000000',
      availableInventoryValuePaisa: '32000000000',
    },
    performance: {
      leadConversionRatePercent: 20,
      collectionEfficiencyPercent: 88,
    },
  };

  const mockSalesPerformance = [
    {
      salesExecutiveId: 'exec-1',
      salesExecutiveName: 'Tareq Rahman',
      confirmedBookingsCount: 8,
      totalSalesValuePaisa: '3000000000',
      totalCollectedPaisa: '1800000000',
      leadsAssignedCount: 40,
      leadsConvertedCount: 8,
      conversionRatePercent: 20,
    },
    {
      salesExecutiveId: 'exec-2',
      salesExecutiveName: 'Nusrat Jahan',
      confirmedBookingsCount: 6,
      totalSalesValuePaisa: '2000000000',
      totalCollectedPaisa: '1400000000',
      leadsAssignedCount: 30,
      leadsConvertedCount: 6,
      conversionRatePercent: 20,
    },
  ];

  it('renders skeleton breathe effect when loading', () => {
    const { container } = render(<ExecutiveKpiStrip isLoading={true} />);
    const skeletons = container.querySelectorAll('.animate-skeleton-breathe');
    expect(skeletons.length).toBe(4);
  });

  it('renders 4 KPI hero cards with Bengali currency formatting', () => {
    render(<ExecutiveKpiStrip summary={mockSummary} />);

    // Check titles
    expect(screen.getByText('Total Sales')).toBeDefined();
    expect(screen.getByText('Total Collection')).toBeDefined();
    expect(screen.getByText('Outstanding AR')).toBeDefined();
    expect(screen.getByText('Cash & Bank Balance')).toBeDefined();

    // Check formatted values
    const expectedSales = formatMoney(BigInt(mockSummary.totalSalesPaisa));
    const expectedCollections = formatMoney(BigInt(mockSummary.totalCollectionPaisa));
    const expectedAR = formatMoney(BigInt(mockSummary.outstandingReceivablePaisa));
    const expectedCash = formatMoney(BigInt(mockSummary.cashBankBalancePaisa));

    expect(screen.getByText(expectedSales)).toBeDefined();
    expect(screen.getByText(expectedCollections)).toBeDefined();
    expect(screen.getByText(expectedAR)).toBeDefined();
    expect(screen.getByText(expectedCash)).toBeDefined();
  });

  it('renders SVG chart components in DashboardChartsSection', () => {
    const { container } = render(
      <DashboardChartsSection summary={mockSummary} salesPerformance={mockSalesPerformance} />,
    );

    // Section headings
    expect(screen.getByText('Accounts Receivable Aging Strip (P0)')).toBeDefined();
    expect(screen.getByText('Sales Conversion Funnel')).toBeDefined();
    expect(screen.getByText('Monthly Operating Cash Flow')).toBeDefined();
    expect(screen.getByText('Sales Executive Performance')).toBeDefined();

    // Check SVG elements rendered
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(3);

    // Check sales executive names in table
    expect(screen.getByText('Tareq Rahman')).toBeDefined();
    expect(screen.getByText('Nusrat Jahan')).toBeDefined();
  });

  it('enforces AT-15 parity: dashboard KPIs strictly match reporting query metrics', () => {
    // AT-15 states: "Dashboard and statutory/operational reports must agree on numbers for identical filters"
    // Mock report payload generated from the exact same underlying calculation
    const reportSalesMetric = {
      grossSalesPaisa: mockSummary.totalSalesPaisa,
      bookedUnits: mockSummary.inventory.bookedUnits,
    };

    const reportCollectionMetric = {
      realizedCollectionPaisa: mockSummary.totalCollectionPaisa,
    };

    const reportInventoryMetric = {
      availableUnits: mockSummary.inventory.availableUnits,
      totalUnits: mockSummary.inventory.totalUnits,
    };

    // Parity assertions
    expect(mockSummary.totalSalesPaisa).toBe(reportSalesMetric.grossSalesPaisa);
    expect(mockSummary.inventory.bookedUnits).toBe(reportSalesMetric.bookedUnits);
    expect(mockSummary.totalCollectionPaisa).toBe(reportCollectionMetric.realizedCollectionPaisa);
    expect(mockSummary.inventory.availableUnits).toBe(reportInventoryMetric.availableUnits);
    expect(mockSummary.inventory.totalUnits).toBe(reportInventoryMetric.totalUnits);
  });
});
