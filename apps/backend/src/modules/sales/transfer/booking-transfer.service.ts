import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import type { RequestTransferDto } from './dto/index.js';

@Injectable()
export class BookingTransferService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
  ) {}

  private async generateTransferNumber(tx: TenantPrisma): Promise<string> {
    const fiscalYear = new Date().getFullYear().toString();
    const seq = await this.sequenceService.next(tx, {
      type: 'BOOKING_TRANSFER',
      fiscalYear,
    });
    return this.sequenceService.format({
      prefix: 'TRF',
      fiscalYear,
      value: seq,
      padding: 5,
    });
  }

  private async generateSuccessorBookingNumber(tx: TenantPrisma): Promise<string> {
    const fiscalYear = new Date().getFullYear().toString();
    const seq = await this.sequenceService.next(tx, {
      type: 'BOOKING',
      fiscalYear,
    });
    return this.sequenceService.format({
      prefix: 'BKG',
      fiscalYear,
      value: seq,
      padding: 5,
    });
  }

  async executeTransfer(
    companyId: string,
    userId: string,
    dto: RequestTransferDto,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      // 1. Validate original booking
      const originalBooking = await db.booking.findFirst({
        where: { id: dto.originalBookingId, companyId, deletedAt: null },
      });

      if (!originalBooking) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          `Original booking not found: ${dto.originalBookingId}`,
          { originalBookingId: dto.originalBookingId },
          HttpStatus.NOT_FOUND,
        );
      }

      if (
        originalBooking.status === 'CANCELLED' ||
        originalBooking.status === 'TRANSFERRED'
      ) {
        throw new AppException(
          ERROR_CODES.INVALID_STATE_TRANSITION,
          `Cannot transfer booking in status: ${originalBooking.status}`,
          { currentStatus: originalBooking.status },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. Validate transferee customer
      const transferee = await db.customer.findFirst({
        where: { id: dto.transfereeCustomerId, companyId, deletedAt: null },
      });

      if (!transferee) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          `Transferee customer not found: ${dto.transfereeCustomerId}`,
          { transfereeCustomerId: dto.transfereeCustomerId },
          HttpStatus.NOT_FOUND,
        );
      }

      if (dto.transfereeCustomerId === originalBooking.customerId) {
        throw new AppException(
          ERROR_CODES.VALIDATION_ERROR,
          'Transferee customer must be different from the original customer',
          { customerId: originalBooking.customerId },
          HttpStatus.BAD_REQUEST,
        );
      }

      const transferNumber = await this.generateTransferNumber(db);
      const successorBookingNumber = await this.generateSuccessorBookingNumber(db);
      const transferFeePaisa = dto.transferFeePaisa ? BigInt(dto.transferFeePaisa) : 0n;

      // 3. CRITICAL ATOMIC SEQUENCE (FLOW-10, RULE-BOOKING-RACE, AT-35):
      // STEP A: Mark old booking as TRANSFERRED *before* inserting successor booking
      // This guarantees the partial unique index "bookings_active_property_idx" never fires!
      await db.booking.update({
        where: { id: originalBooking.id },
        data: {
          status: 'TRANSFERRED',
          transferredAt: new Date(),
        },
      });

      // STEP B: Insert successor booking for transferee customer
      const newBooking = await db.booking.create({
        data: {
          companyId,
          bookingNumber: successorBookingNumber,
          propertyId: originalBooking.propertyId,
          customerId: dto.transfereeCustomerId,
          salesExecutiveId: originalBooking.salesExecutiveId,
          brokerId: originalBooking.brokerId,
          status: originalBooking.status, // Preserve operational status (e.g. CONFIRMED)
          basePricePaisa: originalBooking.basePricePaisa,
          totalPricePaisa: originalBooking.totalPricePaisa,
          discountAmountPaisa: originalBooking.discountAmountPaisa,
          discountPercentage: originalBooking.discountPercentage,
          netPricePaisa: originalBooking.netPricePaisa,
          bookingAmountPaisa: originalBooking.bookingAmountPaisa,
          downPaymentPaisa: originalBooking.downPaymentPaisa,
          totalPaidPaisa: originalBooking.totalPaidPaisa, // Carried over paid amount!
          paymentPlanTemplateId: originalBooking.paymentPlanTemplateId,
          isTransfer: true, // KPI exclusion flag (BR-14: sale counted once)
          predecessorBookingId: originalBooking.id,
          createdById: userId,
        },
      });

      // STEP C: Link successor booking ID to predecessor booking
      await db.booking.update({
        where: { id: originalBooking.id },
        data: { successorBookingId: newBooking.id },
      });

      // STEP D: Create BookingCustomer for transferee
      await db.bookingCustomer.create({
        data: {
          companyId,
          bookingId: newBooking.id,
          customerId: dto.transfereeCustomerId,
          sharePercentage: 100.0,
          isPrimary: true,
        },
      });

      // STEP E: Carry over remaining installments to new booking
      await db.installment.updateMany({
        where: { bookingId: originalBooking.id },
        data: { bookingId: newBooking.id },
      });

      // STEP F: Record BookingTransfer tracking row
      const transferRecord = await db.bookingTransfer.create({
        data: {
          companyId,
          transferNumber,
          originalBookingId: originalBooking.id,
          transfereeCustomerId: dto.transfereeCustomerId,
          newBookingId: newBooking.id,
          transferFeePaisa,
          reason: dto.reason,
          status: 'COMPLETED',
          approvedById: userId,
          approvedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Audit entries
      await this.auditService.record(db, {
        action: 'BOOKING_TRANSFERRED',
        module: 'sales',
        recordType: 'Booking',
        recordId: originalBooking.id,
        before: { status: originalBooking.status, customerId: originalBooking.customerId },
        after: {
          status: 'TRANSFERRED',
          successorBookingId: newBooking.id,
          transferredById: userId,
        },
      });

      await this.auditService.record(db, {
        action: 'BOOKING_SUCCESSOR_CREATED',
        module: 'sales',
        recordType: 'Booking',
        recordId: newBooking.id,
        after: {
          bookingNumber: newBooking.bookingNumber,
          predecessorBookingId: originalBooking.id,
          isTransfer: true,
          transfereeCustomerId: dto.transfereeCustomerId,
        },
      });

      return {
        transfer: transferRecord,
        originalBookingId: originalBooking.id,
        newBookingId: newBooking.id,
        newBookingNumber: newBooking.bookingNumber,
        carriedOverPaidPaisa: newBooking.totalPaidPaisa,
        isTransfer: newBooking.isTransfer,
      };
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }
}
