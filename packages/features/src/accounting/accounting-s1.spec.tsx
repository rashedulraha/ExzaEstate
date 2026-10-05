import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { formatMoney } from '@exzaestate/shared';
import * as appCore from '@exzaestate/app-core';
import { CoaTreeView } from './components/coa/CoaTreeView.js';
import { AccountDrawer } from './components/coa/AccountDrawer.js';
import { AccountModal } from './components/coa/AccountModal.js';
import { testAccounts } from './accounting.test-fixtures.js';

const mockUsePermission = vi.fn();

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: (perm: string, scope?: unknown) => mockUsePermission(perm, scope),
  };
});

describe('Accounting Module (B5) - S1: Chart of Accounts (COA)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });
  });

  it('renders CoaTreeView with root hierarchy and account balances formatted in BDT', () => {
    const onSelect = vi.fn();
    render(<CoaTreeView tree={testAccounts} onSelectAccount={onSelect} />);

    // Verify root account category names
    expect(screen.getByText('Assets')).toBeDefined();
    expect(screen.getByText('Liabilities')).toBeDefined();
    expect(screen.getByText('Equity')).toBeDefined();
    expect(screen.getByText('Revenue')).toBeDefined();
    expect(screen.getByText('Expenses')).toBeDefined();

    // Formatted BDT balances
    expect(screen.getByText(formatMoney('150000000'))).toBeDefined();

    // Terminal leaf accounts displayed under expanded group
    expect(screen.getByText('Cash on Hand')).toBeDefined();
    expect(screen.getByText('City Bank Ltd - Principal Account')).toBeDefined();

    // Click terminal account row
    fireEvent.click(screen.getByText('Cash on Hand'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ code: '1010', name: 'Cash on Hand' }),
    );
  });

  it('renders AccountDrawer with account metadata, system badges, and handles actions', () => {
    const onEdit = vi.fn();
    const onViewLedger = vi.fn();
    const onClose = vi.fn();

    render(
      <AccountDrawer
        account={testAccounts[0]?.children?.[0] || null}
        isOpen={true}
        onClose={onClose}
        onEdit={onEdit}
        onViewLedger={onViewLedger}
      />,
    );

    expect(screen.getByText('1010 · Cash on Hand')).toBeDefined();
    expect(screen.getByText('System Protected')).toBeDefined();

    // Click View Ledger
    const viewLedgerBtn = screen.getByTestId('view-account-ledger-btn');
    fireEvent.click(viewLedgerBtn);
    expect(onViewLedger).toHaveBeenCalledWith(expect.objectContaining({ code: '1010' }));

    // Click Edit Account
    const editBtn = screen.getByTestId('edit-account-btn');
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ code: '1010' }));
  });

  it('renders AccountModal and validates required fields for new account creation', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<AccountModal isOpen={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByText('Create New General Ledger Account')).toBeDefined();

    // Submit without required fields triggers validation
    const saveBtn = screen.getByTestId('save-account-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Account code must be numeric digits')).toBeDefined();
      expect(screen.getByText('Account name must be at least 2 characters')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Account Code/i), {
      target: { value: '1030' },
    });
    fireEvent.change(screen.getByLabelText(/Account Title \/ Name/i), {
      target: { value: 'Brac Bank Escrow' },
    });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          code: '1030',
          name: 'Brac Bank Escrow',
        }),
      );
    });
  });
});
