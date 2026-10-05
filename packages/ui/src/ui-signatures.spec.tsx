import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { PlanView } from './components/plan-view/PlanView.js';
import {
  PaymentTerrace,
  type PaymentTerraceItem,
} from './components/payment-terrace/PaymentTerrace.js';
import { BalanceBeam } from './components/balance-beam/BalanceBeam.js';
import { PostingSeal } from './components/posting-seal/PostingSeal.js';

describe('Signature Component: PlanView', () => {
  it('renders SVG canvas with plots, patterns, and zoom controls', () => {
    const handlePlotClick = vi.fn();
    const plots = [
      {
        id: '1',
        code: 'P01',
        status: 'AVAILABLE' as const,
        sizeSqFt: 1440,
        priceFormatted: '৳50,00,000',
      },
      {
        id: '2',
        code: 'P02',
        status: 'BOOKED' as const,
        sizeSqFt: 2160,
        priceFormatted: '৳75,00,000',
      },
      {
        id: '3',
        code: 'P03',
        status: 'SOLD' as const,
        sizeSqFt: 2880,
        priceFormatted: '৳1,00,00,000',
      },
    ];

    render(<PlanView plots={plots} onPlotClick={handlePlotClick} />);

    expect(screen.getByText('P01')).toBeDefined();
    expect(screen.getByText('P02')).toBeDefined();
    expect(screen.getByText('P03')).toBeDefined();

    expect(screen.getByLabelText('Zoom In')).toBeDefined();
    expect(screen.getByLabelText('Zoom Out')).toBeDefined();
    expect(screen.getByLabelText('Reset Zoom')).toBeDefined();

    fireEvent.click(screen.getByText('P01'));
    expect(handlePlotClick).toHaveBeenCalledWith(expect.objectContaining({ code: 'P01' }));
  });
});

describe('Signature Component: PaymentTerrace', () => {
  const sampleInstallments: PaymentTerraceItem[] = [
    {
      id: 'inst-1',
      label: 'Down Payment',
      dueDate: '2026-08-01',
      amountPaisa: 100000000n,
      paidPaisa: 100000000n,
      status: 'PAID',
    },
    {
      id: 'inst-2',
      label: 'Inst #1',
      dueDate: '2026-09-01',
      amountPaisa: 50000000n,
      paidPaisa: 25000000n,
      status: 'PARTIALLY_PAID',
    },
    {
      id: 'inst-3',
      label: 'Inst #2',
      dueDate: '2026-10-01',
      amountPaisa: 50000000n,
      paidPaisa: 0n,
      status: 'UNPAID',
    },
    {
      id: 'inst-4',
      label: 'Inst #3',
      dueDate: '2026-11-01',
      amountPaisa: 50000000n,
      paidPaisa: 0n,
      status: 'UNPAID',
    },
  ];

  it('renders full terrace with proportional blocks, labels, and collection totals', () => {
    const handleSelect = vi.fn();
    render(
      <PaymentTerrace
        items={sampleInstallments}
        todayDate="2026-09-15"
        onSelectInstallment={handleSelect}
      />,
    );

    expect(screen.getByText('Down Payment')).toBeDefined();
    expect(screen.getByText('Inst #1')).toBeDefined();
    expect(screen.getByText('Inst #2')).toBeDefined();
    expect(screen.getByText('Inst #3')).toBeDefined();
    expect(screen.getByText('Today')).toBeDefined();

    expect(screen.getByText('Collection Ledger Summary')).toBeDefined();
    expect(screen.getByText('৳25,00,000.00')).toBeDefined();
    expect(screen.getAllByText('৳12,50,000.00').length).toBe(2);

    fireEvent.click(screen.getByText('Down Payment'));
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'inst-1', label: 'Down Payment' }),
    );
  });

  it('renders compact sparkline variant without crashing', () => {
    const { container } = render(
      <PaymentTerrace items={sampleInstallments} variant="compact" todayDate="2026-09-15" />,
    );
    expect(container.querySelector('[aria-label="Payment terrace sparkline"]')).toBeDefined();
  });
});

describe('Signature Component: BalanceBeam & PostingSeal', () => {
  it('renders BalanceBeam in balanced and unbalanced states', () => {
    const { rerender } = render(
      <BalanceBeam debitPaisa="50000000" creditPaisa="50000000" lineCount={2} />,
    );
    expect(screen.getByText(/Balanced: Total Debits equal Total Credits/i)).toBeDefined();

    rerender(<BalanceBeam debitPaisa="60000000" creditPaisa="40000000" lineCount={2} />);
    expect(screen.getByText(/Debit is ৳2,00,000.00 more than credit/i)).toBeDefined();
  });

  it('renders PostingSeal with seal details and reversal action', () => {
    const handleReverse = vi.fn();
    const { rerender } = render(
      <PostingSeal
        documentNumber="JRN-2026-00042"
        postedBy="Kazi Accountant"
        postedAt="2026-10-04T10:00:00.000Z"
        canReverse
        onReverse={handleReverse}
      />,
    );

    expect(screen.getByText('JRN-2026-00042')).toBeDefined();
    expect(screen.getByText('POSTED & SEALED')).toBeDefined();
    expect(screen.getByText(/Kazi Accountant/i)).toBeDefined();

    const reverseBtn = screen.getByTestId('reverse-entry-btn');
    fireEvent.click(reverseBtn);
    expect(handleReverse).toHaveBeenCalledTimes(1);

    rerender(
      <PostingSeal
        documentNumber="JRN-2026-00042"
        postedBy="Kazi Accountant"
        postedAt="2026-10-04T10:00:00.000Z"
        isReversed
        reversalDocumentNumber="REV-2026-00001"
        reversalDate="2026-10-05T09:00:00.000Z"
      />,
    );

    expect(screen.getByText('REVERSED / VOID')).toBeDefined();
    expect(screen.getByText(/Offset by reversal/i)).toBeDefined();
    expect(screen.getByText('REV-2026-00001')).toBeDefined();
  });
});
