import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@exzaestate/shared';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { CreateDraftPaymentDto } from './dto/create-draft-payment.dto.js';

export function validatePaymentMethodRequirements(dto: CreateDraftPaymentDto): void {
  if (dto.paymentMethod === 'CHEQUE') {
    if (!dto.chequeNumber || !dto.chequeDate) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Cheque payments require chequeNumber and chequeDate.',
      });
    }
  }

  const amt = BigInt(dto.amountPaisa);
  if (amt <= 0n) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Payment amount must be greater than zero paisa.',
    });
  }
}

export async function validateBookingAndCustomer(
  tx: TenantPrisma,
  companyId: string,
  dto: CreateDraftPaymentDto,
): Promise<{ propertyId?: string; projectId?: string }> {
  const customer = await tx.customer.findFirst({
    where: { id: dto.customerId, companyId },
  });
  if (!customer) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Customer with ID "${dto.customerId}" not found.`,
    });
  }

  if (!dto.bookingId) {
    return { propertyId: dto.propertyId, projectId: dto.projectId };
  }

  const booking = await tx.booking.findFirst({
    where: { id: dto.bookingId, companyId, deletedAt: null },
    include: { customers: true },
  });
  if (!booking) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Booking with ID "${dto.bookingId}" not found.`,
    });
  }

  const isAuthorizedCustomer =
    booking.customerId === dto.customerId ||
    booking.customers.some((c) => c.customerId === dto.customerId);

  if (!isAuthorizedCustomer) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Customer is not a primary buyer or co-buyer on this booking.',
    });
  }

  const property = await tx.property.findUnique({
    where: { id: booking.propertyId },
  });

  return {
    propertyId: booking.propertyId,
    projectId: property?.projectId,
  };
}

function buildBankMethodFields(dto: CreateDraftPaymentDto) {
  return {
    bankName: dto.bankName ?? null,
    bankBranch: dto.bankBranch ?? null,
    accountNumber: dto.accountNumber ?? null,
    transactionReference: dto.transactionReference ?? null,
  };
}

function buildChequeMethodFields(dto: CreateDraftPaymentDto) {
  return {
    chequeNumber: dto.chequeNumber ?? null,
    chequeDate: dto.chequeDate ? new Date(dto.chequeDate) : null,
    chequeStatus: dto.paymentMethod === 'CHEQUE' ? 'Pending' : null,
  };
}

function buildCardMethodFields(dto: CreateDraftPaymentDto) {
  return {
    cardType: dto.cardType ?? null,
    cardLast4: dto.cardLast4 ?? null,
    posTerminalId: dto.posTerminalId ?? null,
  };
}

function resolveAllocationTarget(dto: CreateDraftPaymentDto): string | null {
  if (dto.allocationTarget) return dto.allocationTarget;
  return dto.bookingId ? 'BOOKING_AMOUNT' : null;
}

export function buildDraftPaymentCreateData(
  companyId: string,
  userId: string,
  paymentNumber: string,
  dto: CreateDraftPaymentDto,
  propertyId?: string,
  projectId?: string,
): Prisma.PaymentUncheckedCreateInput {
  const bankFields = buildBankMethodFields(dto);
  const chequeFields = buildChequeMethodFields(dto);
  const cardFields = buildCardMethodFields(dto);
  const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

  return {
    companyId,
    paymentNumber,
    bookingId: dto.bookingId ?? null,
    customerId: dto.customerId,
    propertyId: propertyId ?? dto.propertyId ?? null,
    projectId: projectId ?? dto.projectId ?? null,
    amountPaisa: BigInt(dto.amountPaisa),
    paymentType: dto.paymentType ?? 'BOOKING_MONEY',
    paymentMethod: dto.paymentMethod,
    status: 'Draft',
    isDraft: true,
    allocationTarget: resolveAllocationTarget(dto),
    targetInstallmentId: dto.targetInstallmentId ?? null,
    paymentDate,
    notes: dto.notes ?? null,
    createdById: userId,
    ...bankFields,
    ...chequeFields,
    ...cardFields,
  };
}
