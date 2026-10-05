import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { formatMoney } from '@exzaestate/shared';
import * as appCore from '@exzaestate/app-core';
import { BudgetDataTable } from './components/budgets/BudgetDataTable.js';
import { BudgetModal } from './components/budgets/BudgetModal.js';
import { testBudgets } from './operations.test-fixtures.js';

const mockUsePermission = vi.fn();

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: (perm: string, scope?: unknown) => mockUsePermission(perm, scope),
  };
});

describe('Operations Module (B6) - S4: Budgets & Threshold Alert Engine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });
  });

  it('renders BudgetDataTable with accurate utilization percentages and BDT amounts', () => {
    render(<BudgetDataTable budgets={testBudgets} />);

    // Verify project and category rows
    expect(screen.getByText('Foundation & Civil Structure')).toBeDefined();
    expect(screen.getByText('Electrical & MEP Fitting')).toBeDefined();
    expect(screen.getByText('Interior Finishes')).toBeDefined();
    expect(screen.getByText('HVAC & Elevators')).toBeDefined();

    // Verify formatted amounts
    expect(screen.getByText(formatMoney(BigInt('1000000000')))).toBeDefined();
    expect(screen.getByText(formatMoney(BigInt('650000000')))).toBeDefined();

    // Verify utilization spend labels
    expect(screen.getByText('65.0% spent')).toBeDefined();
    expect(screen.getByText('75.0% spent')).toBeDefined();
    expect(screen.getByText('88.0% spent')).toBeDefined();
    expect(screen.getByText('110.0% spent')).toBeDefined();
  });

  it('displays correct threshold alert chips: NORMAL (<70%), INFO (≥70%), WARNING (≥85%), CRITICAL (≥100%)', () => {
    render(<BudgetDataTable budgets={testBudgets} />);

    // NORMAL chip for 65%
    expect(screen.getByText('NORMAL (65%)')).toBeDefined();

    // INFO chip for 75%
    expect(screen.getByText('INFO (75%)')).toBeDefined();

    // WARNING chip for 88%
    expect(screen.getByText('WARNING (88%)')).toBeDefined();

    // CRITICAL overrun chip for 110%
    expect(screen.getByText('CRITICAL (110%)')).toBeDefined();
  });

  it('allocates new operational budget through BudgetModal', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <BudgetModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        projects={[{ id: 'prj-1', name: 'Meridian Heights' }]}
      />,
    );

    expect(screen.getByText('Set Operational Budget')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('e.g. 5000000'), {
      target: { value: '2500000' }, // ৳25,00,000
    });

    const submitBtn = screen.getByText('Set Budget');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fiscalYear: '2026-2027',
          budgetAmountPaisa: '250000000',
        }),
      );
    });
  });
});
