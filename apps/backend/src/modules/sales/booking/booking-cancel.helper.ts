import {
  BOOKING_STATUSES,
  type BookingStatus,
  DOMAIN_EVENTS,
  PROPERTY_STATUSES,
} from '@exzaestate/shared';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { assertBookingTransition } from '../domain/booking.state-machine.js';
import type { CancelBookingDto } from '../dto/index.js';
import type { BookingWithRelations } from './booking.mapper.js';

export interface CancelBookingParams {
  tx: TenantPrisma;
  companyId: string;
  userId: string;
  booking: BookingWithRelations;
  dto: CancelBookingDto;
  auditService: AuditService;
  outboxService: OutboxService;
}

export async function executeBookingCancellation(
  params: CancelBookingParams,
): Promise<BookingWithRelations> {
  const { tx, companyId, userId, booking, dto, auditService, outboxService } = params;

  // Assert state transition per PRD §9.1
  assertBookingTransition(booking.status as BookingStatus, BOOKING_STATUSES.CANCELLED);

  const targetPropertyStatus = dto.cancellationPolicyStatus || PROPERTY_STATUSES.AVAILABLE;

  // Update booking to CANCELLED
  const updated = await tx.booking.update({
    where: { id: booking.id },
    data: {
      status: BOOKING_STATUSES.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: dto.reason.trim(),
    },
    include: { customers: true, charges: true },
  });

  // Release property back to Available (or Blocked per policy)
  await tx.property.update({
    where: { id: booking.propertyId },
    data: { status: targetPropertyStatus },
  });

  await tx.propertyStatusHistory.create({
    data: {
      companyId,
      propertyId: booking.propertyId,
      fromStatus: PROPERTY_STATUSES.RESERVED,
      toStatus: targetPropertyStatus,
      reason: `Released on booking cancellation: ${dto.reason.trim()}`,
      changedById: userId,
    },
  });

  await tx.bookingStatusHistory.create({
    data: {
      companyId,
      bookingId: booking.id,
      fromStatus: booking.status,
      toStatus: BOOKING_STATUSES.CANCELLED,
      reason: dto.reason.trim(),
      changedById: userId,
    },
  });

  await auditService.record(tx, {
    action: 'BOOKING_CANCELLED',
    module: 'sales',
    recordType: 'Booking',
    recordId: booking.id,
    before: { status: booking.status },
    after: {
      status: BOOKING_STATUSES.CANCELLED,
      cancellationReason: dto.reason.trim(),
    },
  });

  await outboxService.emit(tx, DOMAIN_EVENTS.BOOKING_CANCELLED, {
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    status: BOOKING_STATUSES.CANCELLED,
    propertyId: booking.propertyId,
  });

  return updated;
}
