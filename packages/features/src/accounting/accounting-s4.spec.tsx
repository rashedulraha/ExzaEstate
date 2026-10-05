import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as appCore from '@exzaestate/app-core';
import { CashBankLedgerView } from './components/cashbank/CashBankLedgerView.js';
import { BankTransferModal } from './components/cashbank/BankTransferModal.js';
import { BankReconciliationModal } from './components/cashbank/BankReconciliationModal.js';
import { PeriodManagementView } from './components/periods/PeriodManagementView.js';
import { PeriodActionDialog } from './components/periods/PeriodActionDialog.js';
import { testCashBankAccounts, testFiscalPeriods } from './accounting.test-fixtures.js';

const mockUsePermission = vi.fn();

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: (perm: string, scope?: unknown) => mockUsePermission(perm, scope),
  };
});

describe('Accounting Module (B5) - S4: Cash/Bank Ledger & Fiscal Periods', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });
  });

  it('renders CashBankLedgerView with account type badges and masked account numbers', () => {
    const onOpenTransfer = vi.fn();
    const onOpenReconcile = vi.fn();

    render(
      <CashBankLedgerView
        accounts={testCashBankAccounts}
        onOpenTransfer={onOpenTransfer}
        onOpenReconcile={onOpenReconcile}
      />,
    );

    expect(screen.getByText('Cash in Hand')).toBeDefined();
    expect(screen.getByText('City Bank Ltd - Corporate')).toBeDefined();
    expect(screen.getByText('****4491')).toBeDefined();

    // Trigger transfer modal
    const transferBtn = screen.getByTestId('open-cash-transfer-btn');
    fireEvent.click(transferBtn);
    expect(onOpenTransfer).toHaveBeenCalled();
  });

  it('validates BankTransferModal requiring distinct accounts and amount > 0', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(
      <BankTransferModal
        isOpen={true}
        onClose={vi.fn()}
        accounts={testCashBankAccounts}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Internal Treasury & Bank Transfer')).toBeDefined();

    // Submitting empty form shows validation errors
    const submitBtn = screen.getByTestId('confirm-cash-transfer-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Source account is required')).toBeDefined();
      expect(screen.getByText('Destination account is required')).toBeDefined();
      expect(screen.getByText('Transfer amount must be greater than zero')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    // Select same source and destination
    const sourceBtn = screen.getByLabelText(/Source Account/i);
    fireEvent.click(sourceBtn);
    fireEvent.click(screen.getByText(/Office Vault Cash/i));

    const destBtn = screen.getByLabelText(/Destination Account/i);
    fireEvent.click(destBtn);
    fireEvent.click(
      screen.getAllByText(/Office Vault Cash/i)[1] || screen.getByText(/Office Vault Cash/i),
    );

    fireEvent.change(screen.getByLabelText(/Transfer Amount/i), {
      target: { value: '50000' },
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Destination must be different from source account')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    // Set distinct destination
    fireEvent.click(destBtn);
    fireEvent.click(screen.getByText(/City Bank Ltd/i));
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceBankAccountId: 'cb-1',
          destinationBankAccountId: 'cb-2',
          amountPaisa: '5000000', // ৳50,000 * 100
        }),
      );
    });
  });

  it('renders BankReconciliationModal and displays statement vs book variance', () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(
      <BankReconciliationModal
        isOpen={true}
        account={testCashBankAccounts[1] || null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Reconcile: City Bank Ltd - Corporate')).toBeDefined();
    expect(screen.getByText('GL Book Balance:')).toBeDefined();
    expect(screen.getByLabelText(/Statement Cutoff Date/i)).toBeDefined();
  });

  it('renders PeriodManagementView with OPEN, CLOSED status badges and action triggers', () => {
    const onClosePeriod = vi.fn();
    const onReopenPeriod = vi.fn();

    render(
      <PeriodManagementView
        periods={testFiscalPeriods}
        onClosePeriod={onClosePeriod}
        onReopenPeriod={onReopenPeriod}
      />,
    );

    expect(screen.getByText('July 2026')).toBeDefined();
    expect(screen.getByText('August 2026')).toBeDefined();
    expect(screen.getByText('Closed')).toBeDefined();
    expect(screen.getByText('Open')).toBeDefined();

    // Reopen button on closed period
    const reopenBtn = screen.getByTestId('reopen-period-1-btn');
    fireEvent.click(reopenBtn);
    expect(onReopenPeriod).toHaveBeenCalledWith(testFiscalPeriods[0]);

    // Close button on open period
    const closeBtn = screen.getByTestId('close-period-2-btn');
    fireEvent.click(closeBtn);
    expect(onClosePeriod).toHaveBeenCalledWith(testFiscalPeriods[1]);
  });

  it('enforces 10-char justification and step-up password for reopening closed fiscal period', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(
      <PeriodActionDialog
        isOpen={true}
        period={testFiscalPeriods[0] || null}
        action="REOPEN"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Reopen Fiscal Period: July 2026')).toBeDefined();

    const confirmBtn = screen.getByTestId('confirm-period-action-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Business justification must be at least 10 characters'),
      ).toBeDefined();
      expect(screen.getByText('Step-up password confirmation is required')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    // Provide valid justification and password
    fireEvent.change(screen.getByLabelText(/Reopen Justification/i), {
      target: { value: 'Late vendor utility invoice processing approved' },
    });
    fireEvent.change(screen.getByLabelText(/Step-up Password Confirmation/i), {
      target: { value: 'SuperSecure2026!' },
    });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        'per-01',
        'Late vendor utility invoice processing approved',
        'SuperSecure2026!',
      );
    });
  });
});
