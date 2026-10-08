import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import type { PostingService } from '../../accounting/posting/posting.service.js';
import type { RefundService } from '../../collection/refund/refund.service.js';
import { CancellationService } from './cancellation.service.js';

interface MockTx {
  booking: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  payment: {
    findMany: ReturnType<typeof vi.fn>;
  };
  installment: {
    updateMany: ReturnType<typeof vi.fn>;
  };
  property: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

describe('CancellationService & Refund (AT-08 & Phase A7.6)', () => {
  let service: CancellationService;
  let mockTenantDb: Partial<TenantDb>;
  let mockAuditService: Partial<AuditService>;
  let mockOutboxService: Partial<OutboxService>;
  let mockPostingService: Partial<PostingService>;
  let mockRefundService: Partial<RefundService>;
  let mockTx: MockTx;

  beforeEach(() => {
    mockTx = {
      booking: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      payment: {
        findMany: vi.fn(),
      },
      installment: {
        updateMany: vi.fn(),
      },
      property: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 'prop-at08', projectId: 'proj-001', status: 'BOOKED' }),
        update: vi.fn(),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_companyId, callback) =>
        callback(mockTx as unknown as Parameters<typeof callback>[0]),
      ),
    };

    mockAuditService = { record: vi.fn().mockResolvedValue(undefined) };
    mockOutboxService = { emit: vi.fn().mockResolvedValue(undefined) };
    mockPostingService = {
      post: vi.fn().mockResolvedValue([
        { id: 'jrn-cancel-1', journalNumber: 'JRN-CNL-01' },
        { id: 'jrn-cancel-2', journalNumber: 'JRN-CNL-02' },
      ]),
    };
    mockRefundService = {
      createRefund: vi.fn().mockResolvedValue({
        id: 'rfd-101',
        refundNumber: 'RFD-2026-00001',
        amountPaisa: 90000000n,
      }),
    };

    service = new CancellationService(
      mockTenantDb as TenantDb,
      mockAuditService as AuditService,
      mockOutboxService as OutboxService,
      mockPostingService as PostingService,
      mockRefundService as RefundService,
    );
  });

  it('AT-08: Paid ৳10,00,000, 10% deduction -> refund ৳9,00,000, deduction ৳1,00,000 recognized, booking CANCELLED, property Available', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = 'user-001';
    const bookingId = 'bkg-at08';
    const propertyId = 'prop-at08';
    const customerId = 'cust-at08';

    mockTx.booking.findFirst.mockResolvedValue({
      id: bookingId,
      companyId,
      bookingNumber: 'BKG-2026-00008',
      customerId,
      propertyId,
      status: 'CONFIRMED',
      netPricePaisa: 500000000n, // ৳50,00,000
      vatPaisa: 0n,
      property: {
        id: propertyId,
        projectId: 'proj-001',
        status: 'BOOKED',
      },
    });

    // Customer has paid ৳10,00,000 (100000000 paisa)
    mockTx.payment.findMany.mockResolvedValue([
      { amountPaisa: 60000000n }, // ৳6,00,000
      { amountPaisa: 40000000n }, // ৳4,00,000
    ]);

    mockTx.booking.update.mockResolvedValue({ id: bookingId, status: 'CANCELLED' });
    mockTx.installment.updateMany.mockResolvedValue({ count: 12 });
    mockTx.property.update.mockResolvedValue({ id: propertyId, status: 'AVAILABLE' });

    // Execute cancellation with default 10% deduction
    const result = await service.cancelBooking(companyId, userId, bookingId, {
      reason: 'Customer relocated to Canada',
      deductionRatePct: 10,
      propertyStatus: 'AVAILABLE',
    });

    // 1. Paid amount = 10,00,000; Deduction = 1,00,000 (10%); Refund = 9,00,000
    expect(result.paidAmountPaisa).toBe('100000000');
    expect(result.deductionPaisa).toBe('10000000');
    expect(result.refundPaisa).toBe('90000000');
    expect(result.status).toBe('CANCELLED');
    expect(result.refundId).toBe('rfd-101');
    expect(result.refundNumber).toBe('RFD-2026-00001');

    // 2. Booking status updated to CANCELLED with reason and deduction
    expect(mockTx.booking.update).toHaveBeenCalledWith({
      where: { id: bookingId },
      data: expect.objectContaining({
        status: 'CANCELLED',
        cancellationReason: 'Customer relocated to Canada',
        cancellationDeductionPaisa: 10000000n,
      }),
    });

    // 3. Installments cancelled
    expect(mockTx.installment.updateMany).toHaveBeenCalledWith({
      where: {
        companyId,
        bookingId,
        paymentState: { in: ['Unpaid', 'Partially Paid'] },
      },
      data: { paymentState: 'Cancelled' },
    });

    // 4. Property status set to AVAILABLE per policy
    expect(mockTx.property.update).toHaveBeenCalledWith({
      where: { id: propertyId },
      data: { status: 'AVAILABLE' },
    });

    // 5. Accounting event BOOKING_CANCELLED posted
    expect(mockPostingService.post).toHaveBeenCalledWith(
      companyId,
      userId,
      'BOOKING_CANCELLED',
      expect.objectContaining({
        bookingId,
        customerId,
        netPricePaisa: '500000000',
        paidAmountPaisa: '100000000',
        deductionPaisa: '10000000',
        refundPaisa: '90000000',
      }),
      mockTx,
    );

    // 6. Refund record created
    expect(mockRefundService.createRefund).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        companyId,
        bookingId,
        customerId,
        amountPaisa: 90000000n,
        reason: 'Customer relocated to Canada',
      }),
    );

    // 7. Audit log recorded
    expect(mockAuditService.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        action: 'BOOKING_CANCELLED',
        module: 'sales',
        recordType: 'Booking',
        recordId: bookingId,
      }),
    );

    // 8. Outbox events emitted (including commission clawback)
    expect(mockOutboxService.emit).toHaveBeenCalledWith(
      mockTx,
      'booking.cancelled',
      expect.objectContaining({
        bookingId,
        status: 'CANCELLED',
        refundPaisa: '90000000',
      }),
    );
    expect(mockOutboxService.emit).toHaveBeenCalledWith(
      mockTx,
      'commission.clawback_pending',
      expect.objectContaining({
        bookingId,
        customerId,
      }),
    );
  });

  it('previews cancellation accurately', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const bookingId = 'bkg-prev';

    mockTx.booking.findFirst.mockResolvedValue({
      id: bookingId,
      bookingNumber: 'BKG-PREV-01',
      netPricePaisa: 400000000n,
    });

    mockTx.payment.findMany.mockResolvedValue([{ amountPaisa: 100000000n }]);

    const preview = await service.previewCancellation(companyId, bookingId, {
      deductionRatePct: 15,
    });

    expect(preview.paidAmountPaisa).toBe('100000000');
    expect(preview.deductionRatePct).toBe(15);
    expect(preview.deductionPaisa).toBe('15000000');
    expect(preview.refundPaisa).toBe('85000000');
    expect(preview.formattedRefund).toBe('BDT 8,50,000.00');
  });
});
