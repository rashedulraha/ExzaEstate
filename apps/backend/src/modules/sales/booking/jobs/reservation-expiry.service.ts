import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  BOOKING_STATUSES,
  DOMAIN_EVENTS,
  PAYMENT_STATUSES,
  PROPERTY_STATUSES,
} from '@exzaestate/shared';
import { SystemPrisma } from '../../../../database/system-prisma.service.js';
import { TenantDb } from '../../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../../database/tenant-prisma.js';
import { AuditService } from '../../../../platform/audit/audit.service.js';
import { OutboxService } from '../../../../platform/outbox/outbox.service.js';
import { NotificationService } from '../../../notifications/notification.service.js';

export interface ReservationExpiryResult {
  companyId: string;
  expiredCount: number;
  cancelledBookingIds: string[];
  releasedPropertyIds: string[];
}

interface CandidateBookingSummary {
  id: string;
  bookingNumber: string;
  propertyId: string;
  salesExecutiveId?: string | null;
}

@Injectable()
export class ReservationExpiryService {
  private readonly logger = new Logger(ReservationExpiryService.name);

  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly notificationService: NotificationService,
    @Optional() private readonly systemPrisma?: SystemPrisma,
  ) {}

  /**
   * Scans and auto-cancels unfunded REQUESTED bookings whose reservation hold has expired (FLOW-06, BR-17, AT-11).
   * Releases property back to Available, records status history, emits domain events, and notifies the executive.
   */
  async processCompanyExpirations(
    companyId: string,
    referenceTime?: Date,
  ): Promise<ReservationExpiryResult> {
    const now = referenceTime ?? new Date();

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const candidateBookings = await tx.booking.findMany({
        where: {
          companyId,
          status: BOOKING_STATUSES.REQUESTED,
          totalPaidPaisa: 0n,
          reservationExpiresAt: { lte: now },
          deletedAt: null,
        },
        select: {
          id: true,
          bookingNumber: true,
          propertyId: true,
          salesExecutiveId: true,
        },
      });

      if (candidateBookings.length === 0) {
        return {
          companyId,
          expiredCount: 0,
          cancelledBookingIds: [],
          releasedPropertyIds: [],
        };
      }

      const cancelledBookingIds: string[] = [];
      const releasedPropertyIds: string[] = [];

      for (const candidate of candidateBookings) {
        const didCancel = await this.cancelSingleExpiredBooking(tx, companyId, candidate, now);
        if (didCancel) {
          cancelledBookingIds.push(candidate.id);
          releasedPropertyIds.push(candidate.propertyId);
        }
      }

      this.logger.log(
        `Auto-cancelled ${cancelledBookingIds.length} expired bookings for company ${companyId}`,
      );

      return {
        companyId,
        expiredCount: cancelledBookingIds.length,
        cancelledBookingIds,
        releasedPropertyIds,
      };
    });
  }

  private async cancelSingleExpiredBooking(
    tx: TenantPrisma,
    companyId: string,
    candidate: CandidateBookingSummary,
    now: Date,
  ): Promise<boolean> {
    const current = await tx.booking.findUnique({
      where: { id: candidate.id },
      select: { status: true, totalPaidPaisa: true },
    });

    if (!current || current.status !== BOOKING_STATUSES.REQUESTED || current.totalPaidPaisa > 0n) {
      return false;
    }

    const activePayment = await tx.payment.findFirst({
      where: {
        companyId,
        bookingId: candidate.id,
        status: { in: [PAYMENT_STATUSES.RECEIVED, PAYMENT_STATUSES.POSTED] },
      },
    });

    if (activePayment) {
      return false;
    }

    await tx.booking.update({
      where: { id: candidate.id },
      data: {
        status: BOOKING_STATUSES.CANCELLED,
        cancelledAt: now,
        cancellationReason: 'EXPIRED',
      },
    });

    const property = await tx.property.findUnique({
      where: { id: candidate.propertyId },
      select: { id: true, code: true, status: true },
    });
    const propertyStatus = property?.status ?? PROPERTY_STATUSES.RESERVED;
    const propertyCode = property?.code ?? 'N/A';

    await tx.property.update({
      where: { id: candidate.propertyId },
      data: { status: PROPERTY_STATUSES.AVAILABLE },
    });

    await tx.propertyStatusHistory.create({
      data: {
        companyId,
        propertyId: candidate.propertyId,
        fromStatus: propertyStatus,
        toStatus: PROPERTY_STATUSES.AVAILABLE,
        reason: 'Reservation hold expired without payment (reason: EXPIRED)',
      },
    });

    await tx.bookingStatusHistory.create({
      data: {
        companyId,
        bookingId: candidate.id,
        fromStatus: BOOKING_STATUSES.REQUESTED,
        toStatus: BOOKING_STATUSES.CANCELLED,
        reason: 'EXPIRED',
      },
    });

    await this.auditService.record(tx, {
      action: 'BOOKING_EXPIRED_CANCELLED',
      module: 'sales',
      recordType: 'Booking',
      recordId: candidate.id,
      before: { status: BOOKING_STATUSES.REQUESTED },
      after: {
        status: BOOKING_STATUSES.CANCELLED,
        cancellationReason: 'EXPIRED',
      },
    });

    await this.outboxService.emit(tx, DOMAIN_EVENTS.BOOKING_CANCELLED, {
      bookingId: candidate.id,
      bookingNumber: candidate.bookingNumber,
      status: BOOKING_STATUSES.CANCELLED,
      propertyId: candidate.propertyId,
      cancellationReason: 'EXPIRED',
    });

    await this.notifyExecutiveSafe(tx, companyId, candidate, propertyCode);

    return true;
  }

  private async notifyExecutiveSafe(
    tx: TenantPrisma,
    companyId: string,
    candidate: CandidateBookingSummary,
    propertyCode: string,
  ): Promise<void> {
    if (!candidate.salesExecutiveId) return;

    try {
      await this.notificationService.notify(
        tx,
        'booking.cancelled',
        [candidate.salesExecutiveId],
        {
          bookingNo: candidate.bookingNumber,
          propertyCode,
          reason: 'EXPIRED',
        },
        companyId,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to send expiry notification for booking ${candidate.id}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Cross-tenant sweep across all active companies via SystemPrisma (ARCH-SYSTEM-SCOPE).
   */
  async processAllExpiredBookings(
    referenceTime?: Date,
  ): Promise<{ totalExpired: number; processedCompanies: number }> {
    if (!this.systemPrisma) {
      return { totalExpired: 0, processedCompanies: 0 };
    }

    const companyIds = await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Scan active company IDs for reservation hold expiry sweep',
      async (client) => {
        const rows = await client.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM companies WHERE is_active = true`,
        );
        return rows.map((r) => r.id);
      },
    );

    let totalExpired = 0;
    for (const companyId of companyIds) {
      const res = await this.processCompanyExpirations(companyId, referenceTime);
      totalExpired += res.expiredCount;
    }

    return { totalExpired, processedCompanies: companyIds.length };
  }
}
