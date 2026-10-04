import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { PdfRenderer } from '../../../ports/pdf-renderer.port.js';
import { StatementService } from './statement.service.js';

interface MockTx {
  customer: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  journalLine: {
    findMany: ReturnType<typeof vi.fn>;
  };
  booking: {
    findMany: ReturnType<typeof vi.fn>;
  };
  installment: {
    findMany: ReturnType<typeof vi.fn>;
  };
}

describe('StatementService (AT-14 & Phase A7.5)', () => {
  let service: StatementService;
  let mockTenantDb: Partial<TenantDb>;
  let mockPdfRenderer: Partial<PdfRenderer>;
  let mockTx: MockTx;

  beforeEach(() => {
    mockTx = {
      customer: {
        findFirst: vi.fn(),
      },
      journalLine: {
        findMany: vi.fn(),
      },
      booking: {
        findMany: vi.fn(),
      },
      installment: {
        findMany: vi.fn(),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_companyId, callback) =>
        callback(mockTx as unknown as Parameters<typeof callback>[0]),
      ),
    };

    mockPdfRenderer = {
      render: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 simulated pdf content')),
    };

    service = new StatementService(
      mockTenantDb as TenantDb,
      mockPdfRenderer as PdfRenderer,
    );
  });

  it('generates customer statement with running balance and advances', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const customerId = 'cust-101';

    mockTx.customer.findFirst.mockResolvedValue({
      id: customerId,
      companyId,
      name: 'Tahmid Khan',
      phone: '+8801711223344',
    });


    // Journal lines: 1 booking confirmed (Dr 50,00,000) and 1 payment (Cr 10,00,000)
    mockTx.journalLine.findMany.mockImplementation(
      (args: { where?: { account?: { code?: string } } }) => {
        if (args?.where?.account?.code === '2200') {
          // Advance query
          return Promise.resolve([
            { debitPaisa: 0n, creditPaisa: 5000000n }, // ৳50,000 advance
          ]);
        }
      // Period lines
      return Promise.resolve([
        {
          id: 'line-1',
          debitPaisa: 500000000n,
          creditPaisa: 0n,
          description: 'Receivable for booking BKG-001',
          journal: {
            journalNumber: 'JRN-001',
            reference: 'BKG-001',
            postingDate: new Date('2026-02-01'),
            narration: 'Booking confirmed',
            sourceEventType: 'BOOKING_CONFIRMED',
            type: 'SYSTEM',
          },
        },
        {
          id: 'line-2',
          debitPaisa: 0n,
          creditPaisa: 100000000n,
          description: 'Payment for booking BKG-001',
          journal: {
            journalNumber: 'JRN-002',
            reference: 'PAY-001',
            postingDate: new Date('2026-02-15'),
            narration: 'Payment posted',
            sourceEventType: 'PAYMENT_POSTED',
            type: 'SYSTEM',
          },
        },
      ]);
    });

    const result = await service.generateCustomerStatement(companyId, customerId, {});

    expect(result.customerId).toBe(customerId);
    expect(result.customerName).toBe('Tahmid Khan');
    expect(result.totalDebitsPaisa).toBe('500000000');
    expect(result.totalCreditsPaisa).toBe('100000000');
    expect(result.closingOutstandingPaisa).toBe('400000000');
    expect(result.customerAdvancePaisa).toBe('5000000');
    expect(result.formattedClosingOutstanding).toBe('৳40,00,000.00');
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.runningBalancePaisa).toBe('500000000');
    expect(result.lines[1]?.runningBalancePaisa).toBe('400000000');
  });

  it('AT-14: Statement outstanding == AR ledger balance == AR aging total after booking, 2 partial payments, and reversal', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const customerId = 'cust-at14';

    // 1. Initial Booking: ৳50,00,000 (Dr 1100 500000000n)
    // 2. Payment 1: ৳10,00,000 (Cr 1100 100000000n)
    // 3. Payment 2: ৳5,00,000 (Cr 1100 50000000n)
    // 4. Reversal of Payment 2: (Dr 1100 50000000n)
    // Net AR balance = 50,00,000 - 10,00,000 - 5,00,000 + 5,00,000 = 40,00,000 (400000000n)

    mockTx.journalLine.findMany.mockResolvedValue([
      { debitPaisa: 500000000n, creditPaisa: 0n },
      { debitPaisa: 0n, creditPaisa: 100000000n },
      { debitPaisa: 0n, creditPaisa: 50000000n },
      { debitPaisa: 50000000n, creditPaisa: 0n },
    ]);

    mockTx.booking.findMany.mockResolvedValue([{ id: 'bkg-at14' }]);

    // Installments: after reversal of payment 2, remaining principal is ৳40,00,000
    mockTx.installment.findMany.mockResolvedValue([
      { remainingAmountPaisa: 150000000n }, // Installment 1 remaining
      { remainingAmountPaisa: 250000000n }, // Installment 2 remaining
    ]);

    const reconciliation = await service.reconcileCustomerAr(companyId, customerId);

    expect(reconciliation.customerId).toBe(customerId);
    // Statement outstanding
    expect(reconciliation.statementOutstandingPaisa).toBe('400000000');
    expect(reconciliation.statementOutstandingFormatted).toBe('৳40,00,000.00');

    // AR ledger balance
    expect(reconciliation.arLedgerBalancePaisa).toBe('400000000');
    expect(reconciliation.arLedgerBalanceFormatted).toBe('৳40,00,000.00');

    // AR aging total
    expect(reconciliation.arAgingTotalPaisa).toBe('400000000');
    expect(reconciliation.arAgingTotalFormatted).toBe('৳40,00,000.00');

    // Exactly 0.00 difference and reconciled
    expect(reconciliation.differencePaisa).toBe('0');
    expect(reconciliation.isReconciled).toBe(true);
  });

  it('renders statement PDF buffer via PdfRenderer', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const customerId = 'cust-pdf';

    mockTx.customer.findFirst.mockResolvedValue({
      id: customerId,
      companyId,
      name: 'Karim Ahmed',
      phone: '+8801811223344',
    });

    mockTx.journalLine.findMany.mockResolvedValue([]);

    const pdf = await service.generateStatementPdf(companyId, customerId, {});
    expect(pdf).toBeInstanceOf(Buffer);
    expect(mockPdfRenderer.render).toHaveBeenCalled();
  });
});
