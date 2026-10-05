import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PERMISSIONS } from '@exzaestate/shared';
import * as appCore from '@exzaestate/app-core';
import { getCombinedTimingAndStatus } from './hooks/useInstallmentList.js';
import { PaymentDataTable } from './components/payments/PaymentDataTable.js';
import { PaymentEntryModal } from './components/payments/PaymentEntryModal.js';
import { InstallmentDataTable } from './components/installments/InstallmentDataTable.js';
import { PaymentTerrace, type PaymentTerraceItem } from '@exzaestate/ui';
import type { PaymentItem, InstallmentScheduleItem } from './schemas/collection.schema.js';

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: vi.fn(),
  };
});

const mockPayments: PaymentItem[] = [
  {
    id: 'pay-1',
    receiptNumber: 'REC-2026-0001',
    bookingId: 'book-1',
    bookingCode: 'BK-0010',
    customerId: 'cust-1',
    customerName: 'Rahim Khan',
    propertyCode: 'FLAT-3A',
    amountPaisa: '50000000', // ৳5,00,000
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: '2026-10-01',
    status: 'POSTED',
    previousDuePaisa: '500000000',
    currentDuePaisa: '450000000',
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'pay-2',
    receiptNumber: '',
    bookingId: 'book-2',
    bookingCode: 'BK-0011',
    customerId: 'cust-2',
    customerName: 'Farhana Sultana',
    propertyCode: 'PLOT-12',
    amountPaisa: '20000000', // ৳2,00,000
    paymentMethod: 'CHEQUE',
    chequeNumber: 'CQ-901823',
    chequeBank: 'Islami Bank',
    chequeStatus: 'PENDING',
    paymentDate: '2026-10-02',
    status: 'DRAFT',
    createdAt: '2026-10-02T10:00:00Z',
  },
];

const mockInstallments: InstallmentScheduleItem[] = [
  {
    id: 'inst-1',
    bookingId: 'book-1',
    installmentNumber: 1,
    name: 'Down Payment',
    dueDate: '2026-09-01',
    amountPaisa: '100000000',
    paidPaisa: '100000000',
    remainingPaisa: '0',
    status: 'PAID',
    daysOverdue: 0,
  },
  {
    id: 'inst-2',
    bookingId: 'book-1',
    installmentNumber: 2,
    name: '1st Regular Installment',
    dueDate: '2026-10-01',
    amountPaisa: '50000000',
    paidPaisa: '20000000',
    remainingPaisa: '30000000',
    status: 'PARTIALLY_PAID',
    daysOverdue: 12,
  },
  {
    id: 'inst-3',
    bookingId: 'book-1',
    installmentNumber: 3,
    name: '2nd Regular Installment',
    dueDate: '2026-11-01',
    amountPaisa: '50000000',
    paidPaisa: '0',
    remainingPaisa: '50000000',
    status: 'UNPAID',
    daysOverdue: 0,
  },
];

describe('Collection Module B4: S1 to S3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('S1: Signature Payment Terrace Component', () => {
    it('renders proportional installment blocks and bottom-up fill accurately', () => {
      const terraceData: PaymentTerraceItem[] = [
        {
          id: 'inst-1',
          label: 'Down Payment',
          dueDate: '2026-09-01',
          amountPaisa: 100000000n, // 10 lakh
          paidPaisa: 100000000n,
          status: 'PAID',
        },
        {
          id: 'inst-2',
          label: 'Installment 1',
          dueDate: '2026-10-01',
          amountPaisa: 50000000n, // 5 lakh
          paidPaisa: 20000000n, // 2 lakh paid
          status: 'PARTIALLY_PAID',
        },
        {
          id: 'inst-3',
          label: 'Installment 2',
          dueDate: '2026-11-01',
          amountPaisa: 50000000n,
          paidPaisa: 0n,
          status: 'UNPAID',
        },
      ];

      render(<PaymentTerrace items={terraceData} />);

      expect(screen.getByTestId('payment-terrace')).toBeDefined();
      expect(screen.getByTestId('terrace-block-inst-1')).toBeDefined();
      expect(screen.getByTestId('terrace-block-inst-2')).toBeDefined();
      expect(screen.getByTestId('terrace-block-inst-3')).toBeDefined();

      // Ledger summary row
      expect(screen.getByTestId('terrace-totals-row')).toBeDefined();
      expect(screen.getByText('৳20,00,000.00')).toBeDefined(); // Total scheduled (20 lakh)
      expect(screen.getByText('৳12,00,000.00')).toBeDefined(); // Total collected (12 lakh)
      expect(screen.getByText('৳8,00,000.00')).toBeDefined(); // Balance due (8 lakh)
    });
  });

  describe('S2: Installment Combined Status & Timing Chips', () => {
    it('formats combined chip strings with timing and payment status', () => {
      expect(getCombinedTimingAndStatus('PARTIALLY_PAID', undefined, 12)).toEqual({
        label: 'Partially Paid · Overdue 12 days',
        variant: 'danger',
      });
      expect(getCombinedTimingAndStatus('PAID', 'Paid Late', 0)).toEqual({
        label: 'Paid · Late',
        variant: 'neutral',
      });
      expect(getCombinedTimingAndStatus('PAID', 'Paid On Time', 0)).toEqual({
        label: 'Paid · On Time',
        variant: 'success',
      });
      expect(getCombinedTimingAndStatus('UNPAID', 'Due Today', 0)).toEqual({
        label: 'Due Today',
        variant: 'warning',
      });
      expect(getCombinedTimingAndStatus('UNPAID', 'Upcoming', 0)).toEqual({
        label: 'Upcoming',
        variant: 'info',
      });
      expect(getCombinedTimingAndStatus('WAIVED')).toEqual({
        label: 'Waived',
        variant: 'special',
      });
    });

    it('renders InstallmentDataTable with combined chips and pay buttons', () => {
      const onPay = vi.fn();
      render(<InstallmentDataTable installments={mockInstallments} onPayInstallment={onPay} />);

      expect(screen.getByText('Down Payment')).toBeDefined();
      expect(screen.getByText('1st Regular Installment')).toBeDefined();
      expect(screen.getByText('Paid · On Time')).toBeDefined();
      expect(screen.getByText('Partially Paid · Overdue 12 days')).toBeDefined();

      const payButtons = screen.getAllByRole('button', { name: /^Pay/i });
      expect(payButtons.length).toBeGreaterThan(0);
      fireEvent.click(payButtons[0]!);
      expect(onPay).toHaveBeenCalledWith(mockInstallments[1]);
    });
  });

  describe('S3: Payment Entry & Executive/Accountant Role Gating', () => {
    it('CRITICAL ACCEPTANCE: Executive has NO "Post" button (strictly Draft only)', () => {
      vi.mocked(appCore.usePermission).mockImplementation((perm) => {
        return {
          hasPermission: perm === PERMISSIONS.PAYMENT_CREATE_DRAFT,
          scope: 'OWN',
        };
      });

      render(
        <PaymentEntryModal
          isOpen
          onClose={vi.fn()}
          onSubmitDraft={vi.fn()}
          onSubmitPost={vi.fn()}
          installments={mockInstallments}
        />,
      );

      expect(screen.getByTestId('save-draft-btn')).toBeDefined();
      expect(screen.queryByTestId('post-payment-btn')).toBeNull();
      expect(screen.getByText(/Only Finance \/ Accountants may post payments/i)).toBeDefined();
    });

    it('Accountant has BOTH "Save as Draft" and "Post Payment" buttons', () => {
      vi.mocked(appCore.usePermission).mockImplementation((perm) => {
        return {
          hasPermission:
            perm === PERMISSIONS.PAYMENT_CREATE_DRAFT || perm === PERMISSIONS.PAYMENT_POST,
          scope: 'ALL',
        };
      });

      render(
        <PaymentEntryModal
          isOpen
          onClose={vi.fn()}
          onSubmitDraft={vi.fn()}
          onSubmitPost={vi.fn()}
          installments={mockInstallments}
        />,
      );

      expect(screen.getByTestId('save-draft-btn')).toBeDefined();
      expect(screen.getByTestId('post-payment-btn')).toBeDefined();
    });

    it('renders method-specific fields for Cheque and bKash with allocation preview', () => {
      vi.mocked(appCore.usePermission).mockReturnValue({ hasPermission: true, scope: 'ALL' });

      render(
        <PaymentEntryModal
          isOpen
          onClose={vi.fn()}
          onSubmitDraft={vi.fn()}
          onSubmitPost={vi.fn()}
          installments={mockInstallments}
        />,
      );

      const methodSelect = screen.getByLabelText(/Payment Method/i);

      fireEvent.click(methodSelect);
      fireEvent.click(screen.getByRole('option', { name: 'CHEQUE' }));
      expect(screen.getByLabelText(/Cheque Number/i)).toBeDefined();
      expect(screen.getByLabelText(/Bank Name/i)).toBeDefined();

      fireEvent.click(methodSelect);
      fireEvent.click(screen.getByRole('option', { name: 'BKASH' }));
      expect(screen.getByLabelText(/Transaction ID \(TrxID\)/i)).toBeDefined();

      fireEvent.change(screen.getByLabelText(/Amount \(BDT ৳\)/i), {
        target: { value: '450000' },
      });
      expect(screen.getByText(/Automated Waterfall Allocation Preview/i)).toBeDefined();
    });

    it('gates Post action in PaymentDataTable based on PERMISSIONS.PAYMENT_POST', () => {
      vi.mocked(appCore.usePermission).mockReturnValue({ hasPermission: false, scope: undefined });
      const { rerender } = render(
        <PaymentDataTable payments={mockPayments} onPostPayment={vi.fn()} />,
      );
      expect(screen.queryByRole('button', { name: /Post/i })).toBeNull();

      vi.mocked(appCore.usePermission).mockImplementation((perm) => {
        return { hasPermission: perm === PERMISSIONS.PAYMENT_POST, scope: 'ALL' };
      });
      rerender(<PaymentDataTable payments={mockPayments} onPostPayment={vi.fn()} />);
      expect(screen.getByRole('button', { name: /Post/i })).toBeDefined();
    });
  });
});
