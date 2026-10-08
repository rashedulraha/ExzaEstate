import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatMoney } from '@exzaestate/shared';
import * as appCore from '@exzaestate/app-core';
import type {
  TrialBalanceRowDto,
  BalanceSheetReportDto,
  IncomeStatementReportDto,
} from '@exzaestate/api-client';
import { GeneralLedgerView } from './components/ledger/GeneralLedgerView.js';
import { TrialBalanceView } from './components/reports/TrialBalanceView.js';
import { BalanceSheetView } from './components/reports/BalanceSheetView.js';
import { IncomeStatementView } from './components/reports/IncomeStatementView.js';
import { testAccounts, testLedgerEntries } from './accounting.test-fixtures.js';

const mockUsePermission = vi.fn();

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: (perm: string, scope?: unknown) => mockUsePermission(perm, scope),
  };
});

const mockTbRow = (
  overrides: Partial<TrialBalanceRowDto> & { accountCode: string; accountName: string },
): TrialBalanceRowDto => ({
  accountId: `acc-${overrides.accountCode}`,
  accountType: 'ASSET',
  openingDebitPaisa: '0',
  openingCreditPaisa: '0',
  periodDebitPaisa: '0',
  periodCreditPaisa: '0',
  closingDebitPaisa: '0',
  closingCreditPaisa: '0',
  netDebitPaisa: '0',
  netCreditPaisa: '0',
  netDebitFormatted: 'BDT 0',
  netCreditFormatted: 'BDT 0',
  ...overrides,
});

const mockBalanceSheet: BalanceSheetReportDto = {
  asOfDate: '2026-10-31',
  assets: {
    currentAssets: [
      {
        accountId: 'acc-1',
        accountCode: '1010',
        accountName: 'Cash on Hand',
        balancePaisa: '150000000',
        balanceFormatted: formatMoney('150000000'),
      },
    ],
    totalCurrentAssetsPaisa: '150000000',
    totalCurrentAssetsFormatted: formatMoney('150000000'),
    nonCurrentAssets: [],
    totalNonCurrentAssetsPaisa: '0',
    totalNonCurrentAssetsFormatted: formatMoney('0'),
    totalAssetsPaisa: '150000000',
    totalAssetsFormatted: formatMoney('150000000'),
  },
  liabilities: {
    currentLiabilities: [
      {
        accountId: 'acc-2',
        accountCode: '2010',
        accountName: 'Accounts Payable',
        balancePaisa: '80000000',
        balanceFormatted: formatMoney('80000000'),
      },
    ],
    totalCurrentLiabilitiesPaisa: '80000000',
    totalCurrentLiabilitiesFormatted: formatMoney('80000000'),
    nonCurrentLiabilities: [],
    totalNonCurrentLiabilitiesPaisa: '0',
    totalNonCurrentLiabilitiesFormatted: formatMoney('0'),
    totalLiabilitiesPaisa: '80000000',
    totalLiabilitiesFormatted: formatMoney('80000000'),
  },
  equity: {
    items: [
      {
        accountId: 'acc-3',
        accountCode: '3010',
        accountName: 'Retained Earnings',
        balancePaisa: '70000000',
        balanceFormatted: formatMoney('70000000'),
      },
    ],
    currentPeriodNetIncomePaisa: '0',
    currentPeriodNetIncomeFormatted: formatMoney('0'),
    totalEquityPaisa: '70000000',
    totalEquityFormatted: formatMoney('70000000'),
  },
  totalLiabilitiesAndEquityPaisa: '150000000',
  totalLiabilitiesAndEquityFormatted: formatMoney('150000000'),
  isBalanced: true,
  differencePaisa: '0',
};

const mockIncomeStatement: IncomeStatementReportDto = {
  startDate: '2026-07-01',
  endDate: '2027-06-30',
  revenues: [
    {
      accountId: 'acc-rev',
      accountCode: '4010',
      accountName: 'Plot Sales Revenue',
      amountPaisa: '200000000',
      amountFormatted: formatMoney('200000000'),
    },
  ],
  totalRevenuePaisa: '200000000',
  totalRevenueFormatted: formatMoney('200000000'),
  costOfSales: [
    {
      accountId: 'acc-cogs',
      accountCode: '5010',
      accountName: 'Land Acquisition & Site Works',
      amountPaisa: '120000000',
      amountFormatted: formatMoney('120000000'),
    },
  ],
  totalCostOfSalesPaisa: '120000000',
  totalCostOfSalesFormatted: formatMoney('120000000'),
  grossProfitPaisa: '80000000',
  grossProfitFormatted: formatMoney('80000000'),
  grossProfitMarginPct: 40,
  operatingExpenses: [
    {
      accountId: 'acc-exp',
      accountCode: '5020',
      accountName: 'Administrative Salaries',
      amountPaisa: '30000000',
      amountFormatted: formatMoney('30000000'),
    },
  ],
  totalOperatingExpensesPaisa: '30000000',
  totalOperatingExpensesFormatted: formatMoney('30000000'),
  netProfitPaisa: '50000000',
  netProfitFormatted: formatMoney('50000000'),
  netProfitMarginPct: 25,
};

describe('Accounting Module (B5) - S3: General Ledger & Financial Reports', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });
  });

  it('renders GeneralLedgerView with debit/credit entries, running balance, and totals summary cards', () => {
    const onFilterChange = vi.fn();
    render(
      <GeneralLedgerView
        lines={testLedgerEntries}
        totals={{
          openingBalancePaisa: '0',
          totalDebitsPaisa: '50000000',
          totalCreditsPaisa: '500000',
          closingBalancePaisa: '49500000',
        }}
        filters={{
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        }}
        onFilterChange={onFilterChange}
        accounts={testAccounts}
      />,
    );

    expect(screen.getByText('JV-2026-0001')).toBeDefined();
    expect(screen.getByText('JV-2026-0003')).toBeDefined();
    expect(screen.getByText('Office tea and stationery petty cash')).toBeDefined();
    expect(screen.getByText(formatMoney('49500000'))).toBeDefined();
    expect(screen.getByText(/Opening Balance/i)).toBeDefined();
    expect(screen.getByText(/Closing Balance/i)).toBeDefined();
  });

  it('renders TrialBalanceView with equilibrium banner when total debits equal total credits', () => {
    render(
      <TrialBalanceView
        rows={[
          mockTbRow({
            accountCode: '1010',
            accountName: 'Cash on Hand',
            accountType: 'ASSET',
            closingDebitPaisa: '50000000',
            closingCreditPaisa: '0',
          }),
          mockTbRow({
            accountCode: '2010',
            accountName: 'Accounts Payable',
            accountType: 'LIABILITY',
            closingDebitPaisa: '0',
            closingCreditPaisa: '50000000',
          }),
        ]}
        totalDebitPaisa="50000000"
        totalCreditPaisa="50000000"
        isBalanced={true}
        differencePaisa="0"
        asOfDate="2026-10-31"
        onDateChange={vi.fn()}
      />,
    );

    const banner = screen.getByTestId('tb-balance-banner');
    expect(banner).toBeDefined();
    expect(screen.getByText('Trial Balance in Equilibrium')).toBeDefined();
    expect(screen.getByText('Total Debits === Total Credits')).toBeDefined();
  });

  it('renders TrialBalanceView with discrepancy alert when out of balance', () => {
    render(
      <TrialBalanceView
        rows={[
          mockTbRow({
            accountCode: '1010',
            accountName: 'Cash on Hand',
            accountType: 'ASSET',
            closingDebitPaisa: '50000000',
            closingCreditPaisa: '0',
          }),
          mockTbRow({
            accountCode: '2010',
            accountName: 'Accounts Payable',
            accountType: 'LIABILITY',
            closingDebitPaisa: '0',
            closingCreditPaisa: '40000000',
          }),
        ]}
        totalDebitPaisa="50000000"
        totalCreditPaisa="40000000"
        isBalanced={false}
        differencePaisa="10000000"
        asOfDate="2026-10-31"
        onDateChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Out of Balance')).toBeDefined();
    expect(screen.getByText(`Discrepancy: ${formatMoney('10000000')}`)).toBeDefined();
  });

  it('renders BalanceSheetView verifying Assets, Liabilities, and Equity sections', () => {
    render(
      <BalanceSheetView asOfDate="2026-10-31" onDateChange={vi.fn()} report={mockBalanceSheet} />,
    );

    expect(screen.getByTestId('balance-sheet-view')).toBeDefined();
    expect(screen.getByText('Balance Sheet Equation Verified')).toBeDefined();
    expect(screen.getByText(/Total.*Assets/i)).toBeDefined();
    expect(screen.getAllByText(/Total.*Liabilities/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Total.*Equity/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total Liabilities & Equity:')).toBeDefined();
  });

  it('renders IncomeStatementView verifying Revenues, COGS, Gross Profit, and Net Income', () => {
    render(
      <IncomeStatementView
        startDate="2026-07-01"
        endDate="2027-06-30"
        onStartDateChange={vi.fn()}
        onEndDateChange={vi.fn()}
        report={mockIncomeStatement}
      />,
    );

    expect(screen.getByTestId('income-statement-view')).toBeDefined();
    expect(screen.getByText(/Operating Revenues/i)).toBeDefined();
    expect(screen.getByText(/Cost of Land Sold/i)).toBeDefined();
    expect(screen.getByText(/Gross Profit/i)).toBeDefined();
    expect(screen.getByText('Net Operating Income / (Loss)')).toBeDefined();
    expect(screen.getByText(formatMoney('50000000'))).toBeDefined();
    expect(screen.getByText(/Net Profit Margin: 25%/i)).toBeDefined();
  });
});
