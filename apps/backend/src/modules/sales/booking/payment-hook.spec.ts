import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BOOKING_STATUSES, PROPERTY_STATUSES } from '@exzaestate/shared';
import { BookingConfirmationPaymentHook } from './payment-hook.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import type { PostingService } from '../../accounting/posting/posting.service.js';

import type { TenantPrisma } from '../../../database/tenant-prisma.js';

interface MockTx {
  booking: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  property: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  propertyStatusHistory: {
    create: ReturnType<typeof vi.fn>;
  };
  bookingStatusHistory: {
    create: ReturnType<typeof vi.fn>;
  };
  installment: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  payment: {
    aggregate: ReturnType<typeof vi.fn>;
  };
}

describe('BookingConfirmationPaymentHook (AT-12 & S4)', () => {
  let hook: BookingConfirmationPaymentHook;
  let mockAudit: Partial<AuditService>;
  let mockOutbox: Partial<OutboxService>;
  let mockPosting: Partial<PostingService>;
  let mockTx: MockTx;

  beforeEach(() => {
    mockTx = {
      booking: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      property: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 'prop-1', status: 'Available', projectId: 'proj-1' }),
        update: vi.fn(),
      },
      propertyStatusHistory: {
        create: vi.fn(),
      },
      bookingStatusHistory: {
        create: vi.fn(),
      },
      installment: {
        count: vi.fn(),
        create: vi.fn(),
      },
      payment: {
        aggregate: vi.fn(),
      },
    };

    mockAudit = { record: vi.fn().mockResolvedValue(undefined) };
    mockOutbox = { emit: vi.fn().mockResolvedValue(undefined) };
    mockPosting = { post: vi.fn().mockResolvedValue([]) };

    hook = new BookingConfirmationPaymentHook(
      mockAudit as AuditService,
      mockOutbox as OutboxService,
      mockPosting as PostingService,
    );
  });

  it('AT-12: Keeps REQUESTED when total posted is ৳4,99,999 (below 10% of ৳50,00,000)', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const bookingId = 'bkg-12';

    mockTx.booking.findFirst.mockResolvedValue({
      id: bookingId,
      companyId,
      bookingNumber: 'BKG-2026-00001',
      status: BOOKING_STATUSES.REQUESTED,
      netPricePaisa: 500000000n, // ৳50,00,000
      bookingAmountPaisa: 50000000n, // 10% = ৳5,00,000
      basePricePaisa: 500000000n,
      discountAmountPaisa: 0n,
      vatAmountPaisa: 0n,
      requiresApproval: false,
      approvalStatus: null,
      propertyId: 'prop-1',
      customerId: 'cust-1',
      property: { id: 'prop-1', status: PROPERTY_STATUSES.RESERVED, projectId: 'proj-1' },
    });

    // Sum of posted payments is ৳4,99,999.00 = 49999900n (less than 50000000n)
    mockTx.payment.aggregate.mockResolvedValue({
      _sum: { amountPaisa: 49999900n },
    });

    await hook.onPaymentPosted(mockTx as unknown as TenantPrisma, {
      paymentId: 'pay-1',
      companyId,
      bookingId,
      customerId: 'cust-1',
      amountPaisa: 49999900n,
      paymentType: 'BOOKING_AMOUNT',
      paymentMethod: 'BANK_TRANSFER',
      postedById: 'user-1',
    });

    expect(mockTx.booking.update).not.toHaveBeenCalled();
    expect(mockTx.property.update).not.toHaveBeenCalled();
    expect(mockPosting.post).not.toHaveBeenCalled();
  });

  it('AT-12: Confirms booking to CONFIRMED, marks property Booked, generates schedule & posts journal when ৳1 more is posted reaching ৳5,00,000', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const bookingId = 'bkg-12';

    mockTx.booking.findFirst.mockResolvedValue({
      id: bookingId,
      companyId,
      bookingNumber: 'BKG-2026-00001',
      status: BOOKING_STATUSES.REQUESTED,
      netPricePaisa: 500000000n, // ৳50,00,000
      bookingAmountPaisa: 50000000n, // 10% = ৳5,00,000
      downPaymentPaisa: 0n,
      basePricePaisa: 500000000n,
      discountAmountPaisa: 0n,
      vatAmountPaisa: 0n,
      requiresApproval: false,
      approvalStatus: null,
      propertyId: 'prop-1',
      customerId: 'cust-1',
      property: { id: 'prop-1', status: PROPERTY_STATUSES.RESERVED, projectId: 'proj-1' },
    });

    // Total posted is now 50000000n (৳5,00,000)
    mockTx.payment.aggregate.mockResolvedValue({
      _sum: { amountPaisa: 50000000n },
    });

    mockTx.installment.count.mockResolvedValue(0);

    await hook.onPaymentPosted(mockTx as unknown as TenantPrisma, {
      paymentId: 'pay-2',
      companyId,
      bookingId,
      customerId: 'cust-1',
      amountPaisa: 100n, // ৳1 more
      paymentType: 'BOOKING_AMOUNT',
      paymentMethod: 'BANK_TRANSFER',
      postedById: 'user-1',
    });

    // 1. Booking confirmed
    expect(mockTx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: bookingId },
        data: expect.objectContaining({
          status: BOOKING_STATUSES.CONFIRMED,
        }),
      }),
    );

    // 2. Property booked
    expect(mockTx.property.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prop-1' },
        data: { status: PROPERTY_STATUSES.BOOKED },
      }),
    );

    // 3. Schedule created
    expect(mockTx.installment.create).toHaveBeenCalled();

    // 4. BOOKING_CONFIRMED journal posted
    expect(mockPosting.post).toHaveBeenCalledWith(
      companyId,
      'user-1',
      'BOOKING_CONFIRMED',
      expect.objectContaining({
        bookingId,
        bookingNumber: 'BKG-2026-00001',
        netPricePaisa: '500000000',
      }),
      mockTx,
    );

    // 5. Audit & outbox event
    expect(mockAudit.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        action: 'BOOKING_CONFIRMED',
        recordId: bookingId,
      }),
    );
    expect(mockOutbox.emit).toHaveBeenCalledWith(
      mockTx,
      'booking.confirmed',
      expect.objectContaining({
        bookingId,
      }),
    );
  });
});
