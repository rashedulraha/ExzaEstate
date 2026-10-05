import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { formatMoney } from '@exzaestate/shared';
import * as appCore from '@exzaestate/app-core';
import { BookingTransferWizard } from './components/transfers/BookingTransferWizard.js';
import { ProjectProfitabilityView } from './components/transfers/ProjectProfitabilityView.js';
import {
  testBookingOptions,
  testCustomerOptions,
  testProfitability,
} from './operations.test-fixtures.js';

const mockUsePermission = vi.fn();

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: (perm: string, scope?: unknown) => mockUsePermission(perm, scope),
  };
});

describe('Operations Module (B6) - S5: Booking Transfers & Project Profitability', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });
  });

  it('navigates BookingTransferWizard through 4 steps and executes atomic transfer', async () => {
    const onExecute = vi.fn().mockResolvedValue({
      transferNumber: 'TRF-2026-9901',
      originalBookingId: 'bk-orig-1',
      successorBookingId: 'bk-succ-2',
      transfereeCustomerId: 'cust-2',
      transferredAt: '2026-10-05T20:00:00Z',
    });

    render(
      <BookingTransferWizard
        bookings={testBookingOptions}
        customers={testCustomerOptions}
        onExecute={onExecute}
      />,
    );

    expect(screen.getByText('Booking Ownership Transfer Wizard')).toBeDefined();
    expect(screen.getByText('Step 1 of 4: Atomic Ownership Succession')).toBeDefined();

    // Step 1: Select booking
    fireEvent.click(screen.getByText('BKG-2026-8801'));
    fireEvent.click(screen.getByText('Next'));

    // Step 2: Select Transferee (Mustafizur Rahman)
    expect(screen.getByText('Step 2 of 4: Atomic Ownership Succession')).toBeDefined();
    fireEvent.click(screen.getByText('Mustafizur Rahman'));
    fireEvent.click(screen.getByText('Next'));

    // Step 3: Fee & Reason
    expect(screen.getByText('Step 3 of 4: Atomic Ownership Succession')).toBeDefined();
    fireEvent.click(screen.getByText('Next'));

    // Step 4: Summary & Invariant AT-35
    expect(screen.getByText('Step 4 of 4: Atomic Ownership Succession')).toBeDefined();
    expect(screen.getByText(/Invariant AT-35:/)).toBeDefined();

    // Confirm & Execute
    const executeBtn = screen.getByText('Confirm & Execute Transfer');
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(onExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          originalBookingId: 'bk-orig-1',
          transfereeCustomerId: 'cust-2',
        }),
      );
    });

    // Verification of success screen
    expect(screen.getByText('Booking Transfer Executed Successfully')).toBeDefined();
    expect(screen.getByText('TRF-2026-9901')).toBeDefined();
  });

  it('renders ProjectProfitabilityView with KPI cards and category cost breakdown', () => {
    const onExport = vi.fn();

    render(<ProjectProfitabilityView profitability={testProfitability} onExport={onExport} />);

    // Project title & code
    expect(screen.getByText('Meridian Heights Luxury Living')).toBeDefined();
    expect(screen.getByText('(PRJ-MH)')).toBeDefined();

    // KPIs
    expect(screen.getByText('Total Realized Revenue')).toBeDefined();
    expect(screen.getByText(formatMoney(BigInt('4500000000')))).toBeDefined();

    expect(screen.getByText('Total Project Costs')).toBeDefined();
    expect(screen.getByText(formatMoney(BigInt('3150000000')))).toBeDefined();

    expect(screen.getByText('Net Operating Margin')).toBeDefined();
    expect(screen.getByText(formatMoney(BigInt('1350000000')))).toBeDefined();

    expect(screen.getByText('PROFITABLE')).toBeDefined();
    expect(screen.getByText('30.0%')).toBeDefined();

    // Cost Breakdown Categories
    expect(screen.getByText('Land Acquisition & Legal')).toBeDefined();
    expect(screen.getByText('Development & Construction')).toBeDefined();
    expect(screen.getByText('Marketing & Broker Commission')).toBeDefined();
    expect(screen.getByText('Administrative & Site Overheads')).toBeDefined();

    // Export button
    const exportBtn = screen.getByText('Export P&L Report');
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalled();
  });
});
