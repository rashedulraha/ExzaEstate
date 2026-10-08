import { BadRequestException, ConflictException } from '@nestjs/common';
import { ERROR_CODES, PROPERTY_STATUSES } from '@exzaestate/shared';

export interface BookingValidationCustomerInput {
  customerId: string;
  sharePercentage?: number;
  isPrimary?: boolean;
}

export interface BookingValidationPropertyInput {
  id: string;
  status: string;
  basePricePaisa: bigint;
  premiumPaisa: bigint;
  discountLimitPct: number;
}

export interface BookingValidationPricingInput {
  basePricePaisa: bigint;
  discountAmountPaisa: bigint;
  discountPercentage?: number;
  netPricePaisa: bigint;
}

export interface BookingValidationPlanInput {
  paymentPlanTemplateId?: string;
  minBookingPct?: number;
  bookingAmountPaisa?: bigint;
}

export interface BookingValidationPipelineInput {
  property: BookingValidationPropertyInput;
  primaryCustomerId: string;
  coBuyers?: BookingValidationCustomerInput[];
  pricing: BookingValidationPricingInput;
  plan?: BookingValidationPlanInput;
  hasActiveBooking: boolean;
}

function validatePropertyAvailability(input: BookingValidationPipelineInput): void {
  if (input.hasActiveBooking) {
    throw new ConflictException({
      code: ERROR_CODES.DUPLICATE_BOOKING,
      message:
        'Property already has an active booking. Only one active booking is permitted per property.',
    });
  }

  if (input.property.status !== PROPERTY_STATUSES.AVAILABLE) {
    throw new ConflictException({
      code: ERROR_CODES.DUPLICATE_BOOKING,
      message: `Property is not available for booking (current status: "${input.property.status}").`,
    });
  }
}

function validateCustomerShares(input: BookingValidationPipelineInput): void {
  if (!input.primaryCustomerId) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Primary customer is required for booking.',
    });
  }

  if (!input.coBuyers || input.coBuyers.length === 0) return;

  let totalShares = 0;
  for (const cb of input.coBuyers) {
    if (cb.sharePercentage === undefined || cb.sharePercentage <= 0) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'All co-buyers must have a positive share percentage.',
      });
    }
    totalShares += cb.sharePercentage;
  }
  if (Math.round(totalShares) !== 100) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `Total ownership shares must sum to 100% (currently ${totalShares}%).`,
    });
  }
}

function validatePricingMath(input: BookingValidationPipelineInput): void {
  const expectedNet = input.pricing.basePricePaisa - input.pricing.discountAmountPaisa;
  if (input.pricing.netPricePaisa !== expectedNet) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `Pricing mismatch: net price (BDT ${Number(input.pricing.netPricePaisa) / 100}) does not equal base price − discount (BDT ${Number(expectedNet) / 100}).`,
    });
  }
}

/**
 * Pure domain validation pipeline for booking creation (FLOW-06 / BR-01 / BR-05).
 */
export function validateBookingPipeline(input: BookingValidationPipelineInput): void {
  validatePropertyAvailability(input);
  validateCustomerShares(input);
  validatePricingMath(input);
}
