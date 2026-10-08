import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { OverdueCalculationService } from '../jobs/overdue-calculation.service.js';
import { AgingService } from './aging.service.js';

interface MockTx {
  installment: {
    findMany: ReturnType<typeof vi.fn>;
  };
  journalLine: {
    findMany: ReturnType<typeof vi.fn>;
  };
  customer: {
    findMany: ReturnType<typeof vi.fn>;
  };
}

describe('AgingService & OverdueCalculation (AT-28 & Phase A7.8)', () => {
  let agingService: AgingService;
  let jobService: OverdueCalculationService;
  let mockTenantDb: Partial<TenantDb>;
  let mockOutboxService: Partial<OutboxService>;
  let mockTx: MockTx;

  beforeEach(() => {
    mockTx = {
      installment: {
        findMany: vi.fn(),
      },
      journalLine: {
        findMany: vi.fn(),
      },
      customer: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'cust-1', name: 'Customer One' },
          { id: 'cust-2', name: 'Customer Two' },
        ]),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_companyId, callback) =>
        callback(mockTx as unknown as Parameters<typeof callback>[0]),
      ),
    };

    mockOutboxService = {
      emit: vi.fn().mockResolvedValue(undefined),
    };

    agingService = new AgingService(mockTenantDb as TenantDb);
    jobService = new OverdueCalculationService(
      mockTenantDb as TenantDb,
      mockOutboxService as OutboxService,
    );
  });

  it('AT-28: Aging buckets sum to account 1100 AR balance, correctly places partially paid overdue installments', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const asOfDate = '2026-03-15';

    // 3 installments:
    // 1. Current / Upcoming: Due 2026-03-25 (10 days in future) -> ৳10,00,000 (CURRENT)
    // 2. Overdue 5 days: Due 2026-03-10 -> ৳5,00,000 (DAYS_1_7)
    // 3. Partially paid, overdue 20 days: Due 2026-02-23 -> ৳15,00,000 remaining (DAYS_8_30)
    // Total = 10,00,000 + 5,00,000 + 15,00,000 = 30,00,000 (300000000 paisa)
    mockTx.installment.findMany.mockResolvedValue([
      {
        id: 'inst-1',
        installmentNumber: 1,
        dueDate: new Date('2026-03-25'),
        paymentState: 'Unpaid',
        remainingAmountPaisa: 100000000n,
        booking: {
          customerId: 'cust-1',
          customer: { fullName: 'Customer One' },
        },
      },
      {
        id: 'inst-2',
        installmentNumber: 2,
        dueDate: new Date('2026-03-10'),
        paymentState: 'Unpaid',
        remainingAmountPaisa: 50000000n,
        booking: {
          customerId: 'cust-1',
          customer: { fullName: 'Customer One' },
        },
      },
      {
        id: 'inst-3',
        installmentNumber: 3,
        dueDate: new Date('2026-02-23'),
        paymentState: 'Partially Paid',
        remainingAmountPaisa: 150000000n,
        booking: {
          customerId: 'cust-2',
          customer: { fullName: 'Customer Two' },
        },
      },
    ]);

    // Account 1100 lines net to 300000000 paisa
    mockTx.journalLine.findMany.mockResolvedValue([
      { debitPaisa: 500000000n, creditPaisa: 200000000n }, // 30,00,000 balance
    ]);

    const report = await agingService.getAgingReport(companyId, { asOfDate });

    // Total receivable
    expect(report.totalReceivablePaisa).toBe('300000000');
    expect(report.totalReceivableFormatted).toBe('BDT 30,00,000.00');
    expect(report.reconciledWithArLedger).toBe(true);

    // Buckets
    const currentBucket = report.buckets.find((b) => b.bucket === 'CURRENT');
    const days1to7Bucket = report.buckets.find((b) => b.bucket === 'DAYS_1_7');
    const days8to30Bucket = report.buckets.find((b) => b.bucket === 'DAYS_8_30');

    expect(currentBucket?.amountPaisa).toBe('100000000');
    expect(days1to7Bucket?.amountPaisa).toBe('50000000');
    expect(days8to30Bucket?.amountPaisa).toBe('150000000');

    // Sum of all bucket amounts equals total
    const bucketSum = report.buckets.reduce((acc, b) => acc + BigInt(b.amountPaisa), 0n);
    expect(bucketSum).toBe(300000000n);
  });

  it('AT-28: Nightly calculation detects Partially Paid · Overdue N days and triggers schedule reminder (+3 days)', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const referenceDate = '2026-03-04'; // Exactly 3 days after 2026-03-01

    mockTx.installment.findMany.mockResolvedValue([
      {
        id: 'inst-overdue-3',
        bookingId: 'bkg-1',
        installmentNumber: 2,
        dueDate: new Date('2026-03-01'),
        paymentState: 'Partially Paid',
        remainingAmountPaisa: 200000000n, // ৳20,00,000
        booking: {
          customerId: 'cust-1',
        },
      },
    ]);

    const result = await jobService.runOverdueCalculation(companyId, referenceDate);

    expect(result.scannedCount).toBe(1);
    expect(result.overdueCount).toBe(1);
    expect(result.remindersTriggered).toBe(1);

    expect(mockOutboxService.emit).toHaveBeenCalledWith(
      mockTx,
      'collection.reminder_due',
      expect.objectContaining({
        companyId,
        installmentId: 'inst-overdue-3',
        daysOffset: 3,
        statusLabel: 'Partially Paid · Overdue 3 days',
        remainingAmountPaisa: '200000000',
      }),
    );
  });
});
