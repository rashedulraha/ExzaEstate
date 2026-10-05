import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { formatMoney } from '@exzaestate/shared';
import * as appCore from '@exzaestate/app-core';
import { BrokerDataTable } from './components/commissions/BrokerDataTable.js';
import { BrokerModal } from './components/commissions/BrokerModal.js';
import { CommissionRuleModal } from './components/commissions/CommissionRuleModal.js';
import { CommissionDataTable } from './components/commissions/CommissionDataTable.js';
import { CommissionPayModal } from './components/commissions/CommissionPayModal.js';
import { testBrokers, testCommissionPayables } from './operations.test-fixtures.js';

const mockUsePermission = vi.fn();

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: (perm: string, scope?: unknown) => mockUsePermission(perm, scope),
  };
});

describe('Operations Module (B6) - S3: Commissions & Broker Incentives', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });
  });

  it('renders BrokerDataTable with earnings and outstanding commission balances', () => {
    const onSelect = vi.fn();
    const onPay = vi.fn();
    const onCreateRule = vi.fn();

    render(
      <BrokerDataTable
        brokers={testBrokers}
        onSelectBroker={onSelect}
        onPayCommission={onPay}
        onCreateRule={onCreateRule}
      />,
    );

    expect(screen.getByText('Kamal Hossain Real Estate')).toBeDefined();
    expect(screen.getByText('01799887766')).toBeDefined();
    expect(screen.getByText(formatMoney(BigInt('60000000')))).toBeDefined();
    expect(screen.getByText(formatMoney(BigInt('20000000')))).toBeDefined();

    // Trigger create rule action
    const ruleBtn = screen.getByTitle('Add Commission Rule');
    fireEvent.click(ruleBtn);
    expect(onCreateRule).toHaveBeenCalledWith(testBrokers[0]);
  });

  it('submits BrokerModal with new external agent details', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<BrokerModal isOpen={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByText('Register New Broker')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('e.g. Kamal Hossain'), {
      target: { value: 'Rahim Properties' },
    });
    fireEvent.change(screen.getByPlaceholderText('017xxxxxxxx'), {
      target: { value: '01811223344' },
    });

    const submitBtn = screen.getByText('Create Broker');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rahim Properties',
          phone: '01811223344',
        }),
      );
    });
  });

  it('configures CommissionRuleModal with calculation types and milestones', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<CommissionRuleModal isOpen={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByText('Create Commission Policy Rule')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('e.g. Standard 2% Net Price on Confirmation'), {
      target: { value: 'Executive 3% Net Price' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 2.5'), {
      target: { value: '3.0' },
    });

    const submitBtn = screen.getByText('Create Rule');
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Executive 3% Net Price',
          calculationType: 'PERCENT_NET_PRICE',
          percentage: 3.0,
          triggerEvent: 'ON_CONFIRMED',
        }),
      );
    });
  });

  it('renders CommissionDataTable with clawback reversal indicator and approval actions', async () => {
    const onApprove = vi.fn().mockResolvedValue(undefined);
    const onPay = vi.fn();

    render(
      <CommissionDataTable
        commissions={testCommissionPayables}
        onApprove={onApprove}
        onPay={onPay}
      />,
    );

    // Verify booking numbers & customer names
    expect(screen.getByText('BKG-2026-0101')).toBeDefined();
    expect(screen.getByText('Tanvir Chowdhury')).toBeDefined();
    expect(screen.getByText('EARNED')).toBeDefined();

    // Verify clawback reversal chip
    expect(screen.getByText('CLAWBACK REVERSAL')).toBeDefined();
    expect(screen.getByText('REVERSED')).toBeDefined();

    // Approve action on EARNED commission
    const approveBtn = screen.getByText('Approve');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(onApprove).toHaveBeenCalledWith('comm-1');
    });
  });

  it('disburses broker commission in CommissionPayModal', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <CommissionPayModal
        isOpen={true}
        onClose={onClose}
        commission={testCommissionPayables[0] ?? null}
        onSubmit={onSubmit}
        bankAccounts={[{ id: 'ba-1', name: 'BRAC Bank', accountNumber: '998877' }]}
      />,
    );

    expect(screen.getByText('Disburse Commission')).toBeDefined();
    expect(screen.getByText('Kamal Hossain Real Estate')).toBeDefined();

    const submitBtn = screen.getByText('Disburse Payout');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'BANK_TRANSFER',
        }),
      );
    });
  });
});
