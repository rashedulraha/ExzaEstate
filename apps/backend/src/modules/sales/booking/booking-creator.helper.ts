import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DOMAIN_EVENTS, ERROR_CODES, PROPERTY_STATUSES } from '@exzaestate/shared';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import type { CreateBookingDto } from '../dto/index.js';
import type { LockedPropertyRecord } from './booking-validation.service.js';

export interface ComputeBookingPricingResult {
  basePricePaisa: bigint;
  totalPricePaisa: bigint;
  discountAmountPaisa: bigint;
  discountPercentage: number | null;
  netPricePaisa: bigint;
  bookingAmountPaisa: bigint;
  downPaymentPaisa: bigint;
}

export function computeBookingPricing(
  property: LockedPropertyRecord,
  dto: CreateBookingDto,
): ComputeBookingPricingResult {
  const basePricePaisa = dto.basePricePaisa
    ? BigInt(dto.basePricePaisa)
    : property.base_price_paisa + property.premium_paisa;
  const discountAmountPaisa = dto.discountAmountPaisa ? BigInt(dto.discountAmountPaisa) : 0n;
  const netPricePaisa = dto.netPricePaisa
    ? BigInt(dto.netPricePaisa)
    : basePricePaisa - discountAmountPaisa;

  let discountPercentage = dto.discountPercentage ?? null;
  if (discountPercentage === null && basePricePaisa > 0n && discountAmountPaisa > 0n) {
    discountPercentage = Number((discountAmountPaisa * 10000n) / basePricePaisa) / 100;
  }

  // Minimum booking amount default is 10% of net price (PRD §5.6 / FLOW-06)
  const bookingAmountPaisa = (netPricePaisa * 10n) / 100n;
  const downPaymentPaisa = 0n;

  return {
    basePricePaisa,
    totalPricePaisa: basePricePaisa,
    discountAmountPaisa,
    discountPercentage,
    netPricePaisa,
    bookingAmountPaisa,
    downPaymentPaisa,
  };
}

function buildCustomerCreateInputs(
  companyId: string,
  primaryCustomerId: string,
  coBuyers?: CreateBookingDto['coBuyers'],
): Prisma.BookingCustomerCreateWithoutBookingInput[] {
  if (coBuyers && coBuyers.length > 0) {
    return coBuyers.map((cb) => ({
      companyId,
      customerId: cb.customerId,
      sharePercentage: new Prisma.Decimal(cb.sharePercentage),
      isPrimary: cb.customerId === primaryCustomerId,
    }));
  }
  return [
    {
      companyId,
      customerId: primaryCustomerId,
      sharePercentage: new Prisma.Decimal(100.0),
      isPrimary: true,
    },
  ];
}

function buildBookingMetadata(dto: CreateBookingDto, userId: string, approvalId?: string) {
  return {
    leadId: dto.leadId ?? null,
    quotationId: dto.quotationId ?? null,
    salesExecutiveId: dto.salesExecutiveId ?? userId,
    brokerId: dto.brokerId ?? null,
    approvalId: approvalId ?? null,
    approvalStatus: approvalId ? 'PENDING' : null,
    paymentPlanTemplateId: dto.paymentPlanTemplateId ?? null,
    notes: dto.notes ?? null,
    terms: dto.terms ?? null,
  };
}

export function buildBookingCreateData(
  companyId: string,
  userId: string,
  bookingNumber: string,
  pricing: ComputeBookingPricingResult,
  dto: CreateBookingDto,
  initialStatus: string,
  approvalId?: string,
): Prisma.BookingCreateInput {
  const holdHours = dto.reservationHoldHours ?? 72;
  const reservationExpiresAt = new Date(Date.now() + holdHours * 60 * 60 * 1000);
  const discountPct =
    pricing.discountPercentage !== null ? new Prisma.Decimal(pricing.discountPercentage) : null;
  const meta = buildBookingMetadata(dto, userId, approvalId);

  return {
    companyId,
    bookingNumber,
    propertyId: dto.propertyId,
    customerId: dto.customerId,
    ...meta,
    status: initialStatus,
    basePricePaisa: pricing.basePricePaisa,
    totalPricePaisa: pricing.totalPricePaisa,
    discountAmountPaisa: pricing.discountAmountPaisa,
    discountPercentage: discountPct,
    netPricePaisa: pricing.netPricePaisa,
    bookingAmountPaisa: pricing.bookingAmountPaisa,
    downPaymentPaisa: pricing.downPaymentPaisa,
    totalPaidPaisa: 0n,
    bookingDate: new Date(),
    reservationHoldHours: holdHours,
    reservationExpiresAt,
    createdById: userId,
    customers: {
      create: buildCustomerCreateInputs(companyId, dto.customerId, dto.coBuyers),
    },
  };
}

export interface PersistBookingCreationParams {
  tx: TenantPrisma;
  companyId: string;
  userId: string;
  dto: CreateBookingDto;
  bookingNumber: string;
  pricing: ComputeBookingPricingResult;
  initialStatus: string;
  approvalId?: string;
  auditService: AuditService;
  outboxService: OutboxService;
}

export async function executeBookingCreation(params: PersistBookingCreationParams) {
  const {
    tx,
    companyId,
    userId,
    dto,
    bookingNumber,
    pricing,
    initialStatus,
    approvalId,
    auditService,
    outboxService,
  } = params;

  const createData = buildBookingCreateData(
    companyId,
    userId,
    bookingNumber,
    pricing,
    dto,
    initialStatus,
    approvalId,
  );

  let booking;
  try {
    booking = await tx.booking.create({
      data: createData,
      include: { customers: true, charges: true },
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      throw new ConflictException({
        code: ERROR_CODES.DUPLICATE_BOOKING,
        message: 'Property already has an active booking',
      });
    }
    throw err;
  }

  await tx.property.update({
    where: { id: dto.propertyId },
    data: { status: PROPERTY_STATUSES.RESERVED },
  });

  await tx.propertyStatusHistory.create({
    data: {
      companyId,
      propertyId: dto.propertyId,
      fromStatus: PROPERTY_STATUSES.AVAILABLE,
      toStatus: PROPERTY_STATUSES.RESERVED,
      reason: `Reserved by booking ${bookingNumber}`,
      changedById: userId,
    },
  });

  if (dto.quotationId) {
    await tx.quotation.update({
      where: { id: dto.quotationId },
      data: {
        status: 'Converted',
        convertedAt: new Date(),
        bookingId: booking.id,
      },
    });
  }

  await tx.bookingStatusHistory.create({
    data: {
      companyId,
      bookingId: booking.id,
      fromStatus: null,
      toStatus: initialStatus,
      reason: 'Initial booking request submitted',
      changedById: userId,
    },
  });

  await auditService.record(tx, {
    action: 'BOOKING_CREATED',
    module: 'sales',
    recordType: 'Booking',
    recordId: booking.id,
    after: {
      bookingNumber,
      status: initialStatus,
      propertyId: dto.propertyId,
      customerId: dto.customerId,
      netPricePaisa: pricing.netPricePaisa.toString(),
    },
  });

  await outboxService.emit(tx, DOMAIN_EVENTS.BOOKING_REQUESTED, {
    bookingId: booking.id,
    bookingNumber,
    status: initialStatus,
    propertyId: dto.propertyId,
    customerId: dto.customerId,
  });

  return booking;
}
