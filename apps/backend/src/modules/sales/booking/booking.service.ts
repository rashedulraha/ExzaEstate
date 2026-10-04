import crypto from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { BOOKING_STATUSES, ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { IdempotencyService } from '../../../platform/idempotency/idempotency.service.js';
import { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { ApprovalsService } from '../../approvals/approvals.service.js';
import type {
  BookingResponseDto,
  CancelBookingDto,
  CreateBookingDto,
  QueryBookingsDto,
} from '../dto/index.js';
import { executeBookingCancellation } from './booking-cancel.helper.js';
import { computeBookingPricing, executeBookingCreation } from './booking-creator.helper.js';
import { mapBookingToDto } from './booking.mapper.js';
import { BookingValidationService } from './booking-validation.service.js';

@Injectable()
export class BookingService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly idempotencyService: IdempotencyService,
    private readonly approvalsService: ApprovalsService,
    private readonly validationService: BookingValidationService,
  ) {}

  private async checkDiscountApproval(
    companyId: string,
    userId: string,
    bookingNumber: string,
    pricing: ReturnType<typeof computeBookingPricing>,
  ) {
    if (!pricing.discountPercentage || pricing.discountPercentage <= 0) {
      return { initialStatus: BOOKING_STATUSES.REQUESTED, approvalId: undefined };
    }

    const appRes = await this.approvalsService.request({
      companyId,
      requesterId: userId,
      type: 'DISCOUNT',
      amountPaisa: pricing.discountAmountPaisa,
      percentage: pricing.discountPercentage,
      entityType: 'Booking',
      title: `Discount approval for Booking ${bookingNumber}`,
      throwOnRequired: false,
    });

    if (appRes.required && !appRes.autoApproved) {
      return { initialStatus: BOOKING_STATUSES.PENDING_APPROVAL, approvalId: appRes.approvalId };
    }

    return { initialStatus: BOOKING_STATUSES.REQUESTED, approvalId: undefined };
  }

  async createBooking(
    companyId: string,
    userId: string,
    dto: CreateBookingDto,
    idempotencyKey?: string,
  ): Promise<BookingResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      if (idempotencyKey) {
        const requestHash = crypto.createHash('sha256').update(JSON.stringify(dto)).digest('hex');
        const idem = await this.idempotencyService.begin(tx, {
          key: idempotencyKey,
          requestHash,
          method: 'POST',
          routePattern: '/api/v1/sales/bookings',
          userId,
        });
        if (idem.replayed && idem.body) {
          return idem.body as BookingResponseDto;
        }
      }

      const { property } = await this.validationService.runValidationPipeline(tx, companyId, dto);

      const pricing = computeBookingPricing(property, dto);
      const fiscalYear = new Date().getFullYear().toString();
      const seqVal = await this.sequenceService.next(tx, {
        type: 'BOOKING',
        fiscalYear,
      });
      const bookingNumber = this.sequenceService.format({
        prefix: 'BKG',
        fiscalYear,
        value: seqVal,
        padding: 5,
      });

      const { initialStatus, approvalId } = await this.checkDiscountApproval(
        companyId,
        userId,
        bookingNumber,
        pricing,
      );

      const booking = await executeBookingCreation({
        tx,
        companyId,
        userId,
        dto,
        bookingNumber,
        pricing,
        initialStatus,
        approvalId,
        auditService: this.auditService,
        outboxService: this.outboxService,
      });

      const result = mapBookingToDto(booking);

      if (idempotencyKey) {
        await this.idempotencyService.complete(tx, {
          key: idempotencyKey,
          method: 'POST',
          routePattern: '/api/v1/sales/bookings',
          status: 201,
          body: result,
          userId,
        });
      }

      return result;
    });
  }

  async cancelBooking(
    companyId: string,
    userId: string,
    bookingId: string,
    dto: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, companyId, deletedAt: null },
        include: { customers: true, charges: true },
      });
      if (!booking) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Booking "${bookingId}" not found`,
        });
      }

      const updated = await executeBookingCancellation({
        tx,
        companyId,
        userId,
        booking,
        dto,
        auditService: this.auditService,
        outboxService: this.outboxService,
      });

      return mapBookingToDto(updated);
    });
  }

  async getBooking(companyId: string, bookingId: string): Promise<BookingResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, companyId, deletedAt: null },
        include: { customers: true, charges: true },
      });
      if (!booking) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Booking "${bookingId}" not found`,
        });
      }
      return mapBookingToDto(booking);
    });
  }

  async listBookings(
    companyId: string,
    query: QueryBookingsDto,
  ): Promise<{ items: BookingResponseDto[]; total: number; page: number; limit: number }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { companyId, deletedAt: null };
      if (query.status) where.status = query.status;
      if (query.propertyId) where.propertyId = query.propertyId;
      if (query.customerId) where.customerId = query.customerId;
      if (query.search) {
        where.bookingNumber = { contains: query.search.trim(), mode: 'insensitive' };
      }

      const [bookings, total] = await Promise.all([
        tx.booking.findMany({
          where,
          include: { customers: true, charges: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.booking.count({ where }),
      ]);

      return {
        items: bookings.map(mapBookingToDto),
        total,
        page,
        limit,
      };
    });
  }
}
