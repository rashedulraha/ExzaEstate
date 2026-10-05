import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as appCore from '@exzaestate/app-core';
import { computePaymentKpis } from './hooks/usePaymentList.js';
import { PaymentReversalModal } from './components/payments/PaymentReversalModal.js';
import { ChequeDataTable } from './components/cheques/ChequeDataTable.js';
import { MoneyReceiptModal } from './components/receipts/MoneyReceiptModal.js';
import { CustomerStatementViewer } from './components/statements/CustomerStatementViewer.js';
import { AgingStrip } from './components/aging/AgingStrip.js';
import type { PaymentItem, ChequeLedgerItem } from './schemas/collection.schema.js';

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
  {
    id: 'pay-3',
    receiptNumber: 'REC-2026-0002',
    bookingId: 'book-1',
    bookingCode: 'BK-0010',
    customerId: 'cust-1',
    customerName: 'Rahim Khan',
    amountPaisa: '10000000',
    paymentMethod: 'BKASH',
    mobileTrxId: 'TRX-82910X',
    paymentDate: '2026-10-03',
    status: 'REVERSED',
    createdAt: '2026-10-03T10:00:00Z',
  },
];

const mockCheques: ChequeLedgerItem[] = [
  {
    id: 'chq-1',
    paymentId: 'pay-2',
    chequeNumber: 'CQ-901823',
    bankName: 'Islami Bank Bangladesh',
    branchName: 'Gulshan Branch',
    drawerName: 'Farhana Sultana',
    chequeDate: '2026-10-02',
    amountPaisa: '20000000',
    status: 'PENDING',
    customerName: 'Farhana Sultana',
    bookingCode: 'BK-0011',
  },
  {
    id: 'chq-2',
    paymentId: 'pay-4',
    chequeNumber: 'CQ-110022',
    bankName: 'BRAC Bank',
    drawerName: 'Tanvir Hossain',
    chequeDate: '2026-09-15',
    amountPaisa: '35000000',
    status: 'CLEARED',
    customerName: 'Tanvir Hossain',
    bookingCode: 'BK-0005',
    clearedAt: '2026-09-18T12:00:00Z',
  },
];

describe('Collection Module B4: S4 & S5', () => {
  describe('S4: Cheque Management, Reversal & Institutional Money Receipt', () => {
    it('renders ChequeDataTable with Clear and Bounce workflows for pending cheques', () => {
      vi.mocked(appCore.usePermission).mockReturnValue({ hasPermission: true, scope: 'ALL' });
      const onClear = vi.fn();
      const onBounce = vi.fn();

      render(
        <ChequeDataTable cheques={mockCheques} onClearCheque={onClear} onBounceCheque={onBounce} />,
      );

      expect(screen.getByText('CQ-901823')).toBeDefined();
      expect(screen.getByText('Islami Bank Bangladesh')).toBeDefined();
      expect(screen.getByTestId('clear-cheque-btn')).toBeDefined();
      expect(screen.getByTestId('bounce-cheque-btn')).toBeDefined();
    });

    it('validates PaymentReversalModal with mandatory step-up password and reason', async () => {
      const onConfirm = vi.fn();
      render(
        <PaymentReversalModal
          isOpen
          onClose={vi.fn()}
          payment={mockPayments[0]!}
          onConfirmReversal={onConfirm}
        />,
      );

      expect(screen.getByText(/RULE-IMMUTABLE/i)).toBeDefined();

      const reverseBtn = screen.getByTestId('confirm-reverse-button');
      fireEvent.click(reverseBtn);

      expect(
        await screen.findByText(/Reversal reason must be at least 10 characters/i),
      ).toBeDefined();
      expect(await screen.findByText(/Step-up password confirmation is required/i)).toBeDefined();
      expect(onConfirm).not.toHaveBeenCalled();

      fireEvent.change(screen.getByLabelText(/Reversal Reason/i), {
        target: { value: 'Wrong customer bank account credited by slip' },
      });
      fireEvent.change(screen.getByLabelText(/Step-up Password/i), {
        target: { value: 'SecretPass123!' },
      });

      fireEvent.click(reverseBtn);
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith({
          paymentId: 'pay-1',
          reason: 'Wrong customer bank account credited by slip',
          stepUpPassword: 'SecretPass123!',
        });
      });
    });

    it('renders MoneyReceiptModal per design.md §12 with 3-tier signatory block, watermark and QR verification', () => {
      render(<MoneyReceiptModal isOpen onClose={vi.fn()} payment={mockPayments[0]!} />);

      expect(screen.getByTestId('money-receipt-voucher')).toBeDefined();
      expect(screen.getByTestId('authenticated-watermark')).toBeDefined();
      expect(screen.getByTestId('verification-qr')).toBeDefined();
      expect(screen.getByTestId('signatory-block')).toBeDefined();

      expect(screen.getByText('Prepared By')).toBeDefined();
      expect(screen.getByText('Verified By')).toBeDefined();
      expect(screen.getByText('Authorized Signatory')).toBeDefined();
    });

    it('renders REVERSED / VOID watermark for voided receipts', () => {
      render(
        <MoneyReceiptModal
          isOpen
          onClose={vi.fn()}
          payment={mockPayments[2]!} // pay-3 is REVERSED
        />,
      );

      expect(screen.getByTestId('void-watermark')).toBeDefined();
      expect(screen.getByText(/REVERSED \/ VOID/i)).toBeDefined();
    });
  });

  describe('S5: Customer Statement & Aging Dashboard', () => {
    it('renders CustomerStatementViewer with running balance, double rule and AR reconciliation seal', () => {
      const mockStatement = {
        customerId: 'cust-1',
        customerName: 'Rahim Khan',
        openingBalancePaisa: '0',
        totalDebitsPaisa: '500000000',
        totalCreditsPaisa: '50000000',
        closingOutstandingPaisa: '450000000',
        lines: [
          {
            date: '2026-10-01',
            reference: 'BK-0010',
            description: 'Flat 3A Sale Allotment',
            debitPaisa: '500000000',
            creditPaisa: '0',
            runningBalancePaisa: '500000000',
          },
          {
            date: '2026-10-02',
            reference: 'REC-2026-0001',
            description: 'Booking Money Collection',
            debitPaisa: '0',
            creditPaisa: '50000000',
            runningBalancePaisa: '450000000',
          },
        ],
      };

      const mockRecon = {
        isReconciled: true,
        differencePaisa: '0',
        statementOutstandingPaisa: '450000000',
        arLedgerBalancePaisa: '450000000',
      };

      render(<CustomerStatementViewer statement={mockStatement} reconciliation={mockRecon} />);

      expect(screen.getByTestId('customer-statement-viewer')).toBeDefined();
      expect(screen.getByTestId('reconciliation-seal-success')).toBeDefined();
      expect(screen.getByText('Reconciled with AR Ledger (AT-14)')).toBeDefined();
      expect(screen.getByText('Flat 3A Sale Allotment')).toBeDefined();
      expect(screen.getByText('Booking Money Collection')).toBeDefined();
    });

    it('renders AgingStrip with 5 sequential primary tints and direct labels', () => {
      const buckets = [
        {
          bucket: '1_7' as const,
          label: '1–7 Days',
          amountPaisa: '50000000',
          amountFormatted: '৳5,00,000.00',
          count: 2,
          percentage: 20,
        },
        {
          bucket: '8_30' as const,
          label: '8–30 Days',
          amountPaisa: '75000000',
          amountFormatted: '৳7,50,000.00',
          count: 3,
          percentage: 30,
        },
        {
          bucket: '31_60' as const,
          label: '31–60 Days',
          amountPaisa: '50000000',
          amountFormatted: '৳5,00,000.00',
          count: 2,
          percentage: 20,
        },
        {
          bucket: '61_90' as const,
          label: '61–90 Days',
          amountPaisa: '25000000',
          amountFormatted: '৳2,50,000.00',
          count: 1,
          percentage: 10,
        },
        {
          bucket: '90_PLUS' as const,
          label: '90+ Days',
          amountPaisa: '50000000',
          amountFormatted: '৳5,00,000.00',
          count: 1,
          percentage: 20,
        },
      ];

      render(<AgingStrip buckets={buckets} totalReceivablePaisa="250000000" />);

      expect(screen.getByTestId('aging-strip-component')).toBeDefined();
      expect(screen.getByTestId('aging-card-1_7')).toBeDefined();
      expect(screen.getByTestId('aging-card-8_30')).toBeDefined();
      expect(screen.getByTestId('aging-card-31_60')).toBeDefined();
      expect(screen.getByTestId('aging-card-61_90')).toBeDefined();
      expect(screen.getByTestId('aging-card-90_PLUS')).toBeDefined();
    });

    it('computes collection KPIs accurately', () => {
      const kpis = computePaymentKpis(mockPayments);
      expect(kpis.totalCollectedPaisa).toBe('50000000'); // pay-1
      expect(kpis.totalDraftPaisa).toBe('20000000'); // pay-2
      expect(kpis.countPosted).toBe(1);
      expect(kpis.countDraft).toBe(1);
      expect(kpis.countReversed).toBe(1);
      expect(kpis.countChequePending).toBe(1);
    });
  });
});
