import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BookingTransferService } from './booking-transfer.service.js';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { SequenceService } from '../../../platform/sequence/sequence.service.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';

interface MockTransferTx {
  booking: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  customer: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  bookingCustomer: {
    create: ReturnType<typeof vi.fn>;
  };
  installment: {
    updateMany: ReturnType<typeof vi.fn>;
  };
  bookingTransfer: {
    create: ReturnType<typeof vi.fn>;
  };
}

describe('BookingTransferService (A8.5 & AT-35)', () => {
  let service: BookingTransferService;
  let mockTenantDb: Partial<TenantDb>;
  let mockSequenceService: Partial<SequenceService>;
  let mockAuditService: Partial<AuditService>;
  let mockTx: MockTransferTx;

  const companyId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const originalBookingId = '00000000-0000-0000-0000-000000000010';
  const oldCustomerId = '00000000-0000-0000-0000-000000000020';
  const newCustomerId = '00000000-0000-0000-0000-000000000030';
  const propertyId = '00000000-0000-0000-0000-000000000040';

  beforeEach(() => {
    mockTx = {
      booking: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      customer: {
        findFirst: vi.fn(),
      },
      bookingCustomer: {
        create: vi.fn(),
      },
      installment: {
        updateMany: vi.fn(),
      },
      bookingTransfer: {
        create: vi.fn(),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_cid, cb) =>
        cb(mockTx as unknown as import('../../../database/tenant-prisma.js').TenantPrisma),
      ),
    };

    mockSequenceService = {
      next: vi.fn().mockResolvedValue(1),
      format: vi.fn().mockImplementation(({ prefix, value }) => `${prefix}-2026-00000${value}`),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    service = new BookingTransferService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
    );
  });

  describe('AT-35: Booking Transfer / Name Transfer', () => {
    it('executes atomic transfer: marks old booking TRANSFERRED before inserting successor booking', async () => {
      const callOrder: string[] = [];

      mockTx.booking.findFirst.mockResolvedValue({
        id: originalBookingId,
        companyId,
        bookingNumber: 'BKG-2026-000001',
        propertyId,
        customerId: oldCustomerId,
        salesExecutiveId: 'sales-exec-1',
        brokerId: 'broker-1',
        status: 'CONFIRMED',
        basePricePaisa: 100_000_000n,
        totalPricePaisa: 100_000_000n,
        discountAmountPaisa: 0n,
        discountPercentage: null,
        netPricePaisa: 100_000_000n,
        bookingAmountPaisa: 10_000_000n,
        downPaymentPaisa: 10_000_000n,
        totalPaidPaisa: 30_000_000n, // Paid ৳3,00,000 so far
        paymentPlanTemplateId: 'plan-1',
      });

      mockTx.customer.findFirst.mockResolvedValue({
        id: newCustomerId,
        name: 'Transferee Buyer',
      });

      mockTx.booking.update.mockImplementation(({ data }) => {
        if (data.status === 'TRANSFERRED') {
          callOrder.push('OLD_BOOKING_MARKED_TRANSFERRED');
        } else if (data.successorBookingId) {
          callOrder.push('OLD_BOOKING_LINKED_SUCCESSOR');
        }
        return Promise.resolve({});
      });

      mockTx.booking.create.mockImplementation(({ data }) => {
        callOrder.push('NEW_BOOKING_INSERTED');
        return Promise.resolve({
          id: 'successor-booking-1',
          ...data,
        });
      });

      mockTx.bookingCustomer.create.mockResolvedValue({});
      mockTx.installment.updateMany.mockResolvedValue({ count: 12 });
      mockTx.bookingTransfer.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'transfer-1',
          ...data,
        }),
      );

      const result = await service.executeTransfer(companyId, userId, {
        originalBookingId,
        transfereeCustomerId: newCustomerId,
        transferFeePaisa: '500000', // ৳5,000 fee
        reason: 'Buyer assignment to brother',
      });

      // CRITICAL INVARIANT: OLD_BOOKING_MARKED_TRANSFERRED must occur BEFORE NEW_BOOKING_INSERTED
      // so partial unique index on active bookings is never violated!
      expect(callOrder[0]).toBe('OLD_BOOKING_MARKED_TRANSFERRED');
      expect(callOrder[1]).toBe('NEW_BOOKING_INSERTED');
      expect(callOrder[2]).toBe('OLD_BOOKING_LINKED_SUCCESSOR');

      // Successor booking checks
      expect(result.newBookingNumber).toBe('BKG-2026-000001');
      expect(result.carriedOverPaidPaisa).toBe(30_000_000n);
      expect(result.isTransfer).toBe(true);

      // Re-link installments
      expect(mockTx.installment.updateMany).toHaveBeenCalledWith({
        where: { bookingId: originalBookingId },
        data: { bookingId: 'successor-booking-1' },
      });

      // Transfer record logged
      expect(mockTx.bookingTransfer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          originalBookingId,
          transfereeCustomerId: newCustomerId,
          status: 'COMPLETED',
          transferFeePaisa: 500_000n,
        }),
      });

      // Audit logged
      expect(mockAuditService.record).toHaveBeenCalledTimes(2);
    });

    it('rejects transfer if transferee customer is the same as the current customer', async () => {
      mockTx.booking.findFirst.mockResolvedValue({
        id: originalBookingId,
        customerId: oldCustomerId,
        status: 'CONFIRMED',
      });
      mockTx.customer.findFirst.mockResolvedValue({
        id: oldCustomerId,
      });

      await expect(
        service.executeTransfer(companyId, userId, {
          originalBookingId,
          transfereeCustomerId: oldCustomerId, // Same customer!
        }),
      ).rejects.toThrow('Transferee customer must be different');
    });

    it('rejects transfer if original booking is CANCELLED or already TRANSFERRED', async () => {
      mockTx.booking.findFirst.mockResolvedValue({
        id: originalBookingId,
        status: 'CANCELLED',
      });

      await expect(
        service.executeTransfer(companyId, userId, {
          originalBookingId,
          transfereeCustomerId: newCustomerId,
        }),
      ).rejects.toThrow('Cannot transfer booking in status: CANCELLED');
    });
  });
});
