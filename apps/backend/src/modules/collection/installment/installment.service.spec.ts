import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InstallmentService } from './installment.service.js';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';

interface MockTx {
  booking: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  installment: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  payment: {
    count: ReturnType<typeof vi.fn>;
  };
}

describe('InstallmentService (A7.1)', () => {
  let service: InstallmentService;
  let mockTenantDb: Partial<TenantDb>;
  let mockAuditService: Partial<AuditService>;
  let mockTx: MockTx;

  beforeEach(() => {
    mockTx = {
      booking: {
        findFirst: vi.fn(),
      },
      installment: {
        count: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      payment: {
        count: vi.fn(),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_companyId, callback) => callback(mockTx)),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    service = new InstallmentService(mockTenantDb as TenantDb, mockAuditService as AuditService);
  });

  it('creates installment schedule with accurate split and records audit event', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const bookingId = '11111111-1111-1111-1111-111111111111';

    mockTx.booking.findFirst.mockResolvedValue({
      id: bookingId,
      companyId,
      netPricePaisa: 500000000n, // ৳50,00,000
      bookingAmountPaisa: 50000000n, // ৳5,00,000
      downPaymentPaisa: 50000000n, // ৳5,00,000
    });

    mockTx.installment.count.mockResolvedValue(0);
    mockTx.installment.create.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'inst-1', ...args.data }),
    );
    mockTx.installment.findMany.mockResolvedValue([
      {
        id: 'inst-1',
        companyId,
        bookingId,
        installmentNumber: 1,
        name: 'Installment 1',
        type: 'Regular',
        dueDate: new Date('2026-11-01T00:00:00.000Z'),
        amountPaisa: 400000000n,
        paidAmountPaisa: 0n,
        waivedAmountPaisa: 0n,
        remainingAmountPaisa: 400000000n,
        paymentState: 'Unpaid',
        isCancelled: false,
      },
    ]);

    const result = await service.createScheduleForBooking(companyId, {
      bookingId,
      installmentCount: 1,
      firstDueDate: '2026-11-01',
      frequency: 'MONTHLY',
    });

    expect(result.totalInstallments).toBe(1);
    expect(mockTx.installment.create).toHaveBeenCalledTimes(1);
    expect(mockAuditService.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        action: 'INSTALLMENT_SCHEDULE_CREATED',
        recordType: 'booking',
        recordId: bookingId,
      }),
    );
  });

  it('computes AT-05 state: ৳3,00,000 installment with ৳1,00,000 paid before due is Partially Paid · Upcoming', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const installmentId = 'inst-05';

    mockTx.installment.findFirst.mockResolvedValue({
      id: installmentId,
      companyId,
      bookingId: 'booking-1',
      installmentNumber: 2,
      name: 'Installment 2',
      type: 'Regular',
      dueDate: new Date('2026-12-01T00:00:00.000Z'),
      amountPaisa: 30000000n, // ৳3,00,000
      paidAmountPaisa: 10000000n, // ৳1,00,000
      waivedAmountPaisa: 0n,
      remainingAmountPaisa: 20000000n, // ৳2,00,000
      paymentState: 'Partially Paid',
      isCancelled: false,
    });

    const res = await service.findById(companyId, installmentId, '2026-10-05');
    expect(res.paymentState).toBe('Partially Paid');
    expect(res.timingState).toBe('Upcoming');
    expect(res.statusLabel).toBe('Partially Paid · Upcoming');
    expect(res.remainingAmountPaisa).toBe('20000000');
    expect(res.remainingAmountFormatted).toBe('৳2,00,000.00');
  });
});
