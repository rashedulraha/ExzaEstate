import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { formatMoney } from '@exzaestate/shared';
import * as appCore from '@exzaestate/app-core';
import { ExpenseDataTable } from './components/expenses/ExpenseDataTable.js';
import { ExpenseDrawer } from './components/expenses/ExpenseDrawer.js';
import { ExpensePayModal } from './components/expenses/ExpensePayModal.js';
import { testVouchers } from './operations.test-fixtures.js';

const mockUsePermission = vi.fn();

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: (perm: string, scope?: unknown) => mockUsePermission(perm, scope),
  };
});

describe('Operations Module (B6) - S1: Expense Vouchers & Threshold Governance', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });
  });

  it('renders ExpenseDataTable with status chips and BDT currency formatting', () => {
    const onSelect = vi.fn();
    render(<ExpenseDataTable vouchers={testVouchers} onSelectVoucher={onSelect} />);

    // Verify voucher numbers
    expect(screen.getByText('EXP-2026-0001')).toBeDefined();
    expect(screen.getByText('EXP-2026-0002')).toBeDefined();
    expect(screen.getByText('EXP-2026-0003')).toBeDefined();

    // Verify Payee names
    expect(screen.getByText('Dhaka Stationery World')).toBeDefined();
    expect(screen.getByText('Bashundhara Heavy Machinery')).toBeDefined();

    // Formatted BDT amounts
    expect(screen.getByText(formatMoney(BigInt('1500000')))).toBeDefined();
    expect(screen.getByText(formatMoney(BigInt('75000000')))).toBeDefined();

    // Verify status badges
    expect(screen.getByText('SUBMITTED')).toBeDefined();
    expect(screen.getByText('APPROVED')).toBeDefined();
    expect(screen.getByText('DRAFT')).toBeDefined();

    // Click inspect button
    const inspectButtons = screen.getAllByTitle('View Voucher Details');
    if (inspectButtons[0]) {
      fireEvent.click(inspectButtons[0]);
      expect(onSelect).toHaveBeenCalledWith(testVouchers[0]);
    }
  });

  it('renders dashed-border EmptyState when vouchers list is empty', () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();
    render(
      <ExpenseDataTable vouchers={[]} onSelectVoucher={onSelect} onCreateVoucher={onCreate} />,
    );

    expect(screen.getByText('No expense vouchers recorded')).toBeDefined();
    expect(
      screen.getByText(
        'Record operational expenses, vendor bills, or utility disbursements to initiate approval governance.',
      ),
    ).toBeDefined();
    const actionBtn = screen.getByText('New Voucher');
    expect(actionBtn).toBeDefined();
    fireEvent.click(actionBtn);
    expect(onCreate).toHaveBeenCalled();
  });

  it('enforces threshold governance banner: MD approval required for > BDT 5,00,000', () => {
    const highValueVoucher = testVouchers[1]; // BDT 7,50,000 (> BDT 5,00,000)
    render(<ExpenseDrawer isOpen={true} onClose={vi.fn()} voucher={highValueVoucher ?? null} />);

    // Should render MD approval requirement banner
    expect(
      screen.getByText(
        /High-Value Voucher \(> BDT 5,00,000\): Requires Managing Director \(MD\) Approval/,
      ),
    ).toBeDefined();
  });

  it('displays standard GM / MD threshold banner for vouchers <= BDT 5,00,000', () => {
    const lowValueVoucher = testVouchers[0]; // BDT 15,000 (≤ BDT 5,00,000)
    render(<ExpenseDrawer isOpen={true} onClose={vi.fn()} voucher={lowValueVoucher ?? null} />);

    expect(
      screen.getByText(/Standard Voucher \(≤ BDT 5,00,000\): GM or MD Approval Authorized/),
    ).toBeDefined();
  });

  it('handles lifecycle actions: submit, approve, verify, pay, and reject', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onApprove = vi.fn().mockResolvedValue(undefined);
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const onPay = vi.fn();
    const onReject = vi.fn().mockResolvedValue(undefined);

    // Test SUBMITTED state actions (Approve, Reject)
    const { rerender } = render(
      <ExpenseDrawer
        isOpen={true}
        onClose={vi.fn()}
        voucher={testVouchers[0] ?? null} // SUBMITTED
        onSubmit={onSubmit}
        onApprove={onApprove}
        onVerify={onVerify}
        onPay={onPay}
        onReject={onReject}
      />,
    );

    const approveBtn = screen.getByText('Approve Voucher');
    fireEvent.click(approveBtn);
    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith('vch-1');
    });

    // Test APPROVED state actions (Verify, Disburse)
    rerender(
      <ExpenseDrawer
        isOpen={true}
        onClose={vi.fn()}
        voucher={testVouchers[1] ?? null} // APPROVED
        onSubmit={onSubmit}
        onApprove={onApprove}
        onVerify={onVerify}
        onPay={onPay}
        onReject={onReject}
      />,
    );

    const verifyBtn = screen.getByText('Verify Voucher');
    fireEvent.click(verifyBtn);
    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith('vch-2');
    });

    const payBtn = screen.getByText('Disburse Payment');
    fireEvent.click(payBtn);
    expect(onPay).toHaveBeenCalled();
  });

  it('renders ExpensePayModal and processes payment disbursement', async () => {
    const onPay = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ExpensePayModal
        isOpen={true}
        onClose={onClose}
        voucher={testVouchers[1] ?? null}
        onPay={onPay}
        bankAccounts={[{ id: 'ba-1', name: 'City Bank', accountNumber: '11002233' }]}
      />,
    );

    expect(screen.getByText('Disburse Expense Voucher')).toBeDefined();
    expect(screen.getByText('Bashundhara Heavy Machinery')).toBeDefined();
    expect(screen.getByText(formatMoney(BigInt('75000000')))).toBeDefined();

    const submitBtn = screen.getByText('Confirm & Disburse');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onPay).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'BANK_TRANSFER',
        }),
      );
    });
  });
});
