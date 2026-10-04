import { describe, expect, it } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ERROR_CODES, PROPERTY_STATUSES } from '@exzaestate/shared';
import {
  type BookingValidationPipelineInput,
  validateBookingPipeline,
} from './booking-validation.pipeline.js';

describe('Booking Validation Pipeline', () => {
  const baseValidInput: BookingValidationPipelineInput = {
    property: {
      id: 'prop-1',
      status: PROPERTY_STATUSES.AVAILABLE,
      basePricePaisa: 10_000_000_0n,
      premiumPaisa: 0n,
      discountLimitPct: 5.0,
    },
    primaryCustomerId: 'cust-1',
    pricing: {
      basePricePaisa: 10_000_000_0n,
      discountAmountPaisa: 500_000_0n,
      discountPercentage: 5.0,
      netPricePaisa: 9_500_000_0n,
    },
    hasActiveBooking: false,
  };

  it('passes when all validations are satisfied', () => {
    expect(() => validateBookingPipeline(baseValidInput)).not.toThrow();
  });

  it('rejects when property has an active booking (DUPLICATE_BOOKING)', () => {
    const input = { ...baseValidInput, hasActiveBooking: true };
    try {
      validateBookingPipeline(input);
      expect.unreachable('Should have thrown');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ConflictException);
      const resp = (err as ConflictException).getResponse() as { code: string };
      expect(resp.code).toBe(ERROR_CODES.DUPLICATE_BOOKING);
    }
  });

  it('rejects when property is not Available (e.g. Reserved or Booked)', () => {
    const input = {
      ...baseValidInput,
      property: { ...baseValidInput.property, status: PROPERTY_STATUSES.RESERVED },
    };
    try {
      validateBookingPipeline(input);
      expect.unreachable('Should have thrown');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ConflictException);
      const resp = (err as ConflictException).getResponse() as { code: string };
      expect(resp.code).toBe(ERROR_CODES.DUPLICATE_BOOKING);
    }
  });

  it('rejects when primary customer is missing', () => {
    const input = { ...baseValidInput, primaryCustomerId: '' };
    expect(() => validateBookingPipeline(input)).toThrow(BadRequestException);
  });

  it('rejects when joint ownership shares do not sum to 100%', () => {
    const input: BookingValidationPipelineInput = {
      ...baseValidInput,
      coBuyers: [
        { customerId: 'cust-1', sharePercentage: 60, isPrimary: true },
        { customerId: 'cust-2', sharePercentage: 30, isPrimary: false }, // sum = 90%
      ],
    };
    expect(() => validateBookingPipeline(input)).toThrow(BadRequestException);
  });

  it('rejects pricing math mismatch', () => {
    const input: BookingValidationPipelineInput = {
      ...baseValidInput,
      pricing: {
        basePricePaisa: 10_000_000_0n,
        discountAmountPaisa: 500_000_0n,
        netPricePaisa: 9_000_000_0n, // Expected 9_500_000_0n
      },
    };
    expect(() => validateBookingPipeline(input)).toThrow(BadRequestException);
  });
});
