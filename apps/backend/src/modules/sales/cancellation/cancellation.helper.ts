import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import type { Booking } from '@prisma/client';
import type { RequestCancellationDto } from './dto/cancellation.dto.js';

export function assertBookingCancellable(
  booking: Booking | null,
  bookingId: string,
): asserts booking is Booking {
  if (!booking) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Booking with ID "${bookingId}" not found`,
    });
  }

  if (booking.status === 'CANCELLED') {
    throw new BadRequestException({
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
      message: `Booking "${bookingId}" is already cancelled`,
    });
  }

  if (booking.status === 'COMPLETED') {
    throw new BadRequestException({
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
      message: `Completed booking "${bookingId}" cannot be cancelled`,
    });
  }
}

export function computeCancellationAmounts(
  dto: RequestCancellationDto,
  paidAmountPaisa: bigint,
): { deductionPaisa: bigint; refundPaisa: bigint } {
  let deductionPaisa: bigint;
  if (dto.deductionPaisa !== undefined) {
    deductionPaisa = BigInt(dto.deductionPaisa);
  } else {
    const ratePct = dto.deductionRatePct ?? 10;
    deductionPaisa = (paidAmountPaisa * BigInt(ratePct)) / 100n;
  }

  if (deductionPaisa > paidAmountPaisa) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `Deduction amount (${deductionPaisa}) cannot exceed total paid amount (${paidAmountPaisa})`,
    });
  }

  return {
    deductionPaisa,
    refundPaisa: paidAmountPaisa - deductionPaisa,
  };
}
