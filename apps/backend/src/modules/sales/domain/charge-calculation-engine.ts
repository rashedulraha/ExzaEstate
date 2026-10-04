import { BadRequestException } from '@nestjs/common';
import { ERROR_CODES, formatMoney, Money } from '@exzaestate/shared';

export type ChargeCalculationType = 'FIXED' | 'PERCENTAGE';
export type ChargePayableStage = 'AT_BOOKING' | 'IN_SCHEDULE' | 'AT_HANDOVER' | 'ON_DEMAND';

export interface ChargeItemInput {
  name: string;
  chargeTypeCode?: string;
  calculationType: ChargeCalculationType;
  amountPaisa?: bigint;
  ratePct?: number; // e.g. 1.5 for 1.5%
  isIncludedInNetPrice?: boolean;
  payableStage?: ChargePayableStage;
  vatRatePct?: number; // e.g. 5 for 5% VAT (default 0)
}

export interface CalculatedChargeItem {
  name: string;
  chargeTypeCode?: string;
  calculationType: ChargeCalculationType;
  baseAmountPaisa: bigint;
  baseAmountFormatted: string;
  vatRatePct: number;
  vatAmountPaisa: bigint;
  vatAmountFormatted: string;
  totalAmountPaisa: bigint;
  totalAmountFormatted: string;
  isIncludedInNetPrice: boolean;
  payableStage: ChargePayableStage;
}

export interface ChargeCalculationSummary {
  netPricePaisa: bigint;
  netPriceFormatted: string;
  totalIncludedChargesPaisa: bigint;
  totalIncludedChargesFormatted: string;
  totalAdditionalChargesPaisa: bigint;
  totalAdditionalChargesFormatted: string;
  totalVatPaisa: bigint;
  totalVatFormatted: string;
  grandTotalPaisa: bigint;
  grandTotalFormatted: string;
  items: CalculatedChargeItem[];
}

export function computeBaseChargeAmount(
  netPricePaisa: bigint,
  calculationType: ChargeCalculationType,
  amountPaisa?: bigint,
  ratePct?: number,
): bigint {
  if (calculationType === 'FIXED') {
    if (amountPaisa === undefined || amountPaisa === null) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Fixed charge requires amountPaisa',
      });
    }
    if (amountPaisa < 0n) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Charge amount cannot be negative',
      });
    }
    return amountPaisa;
  }

  // PERCENTAGE
  if (ratePct === undefined || ratePct === null) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Percentage charge requires ratePct',
    });
  }
  if (ratePct < 0) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Charge percentage rate cannot be negative',
    });
  }

  const rateFraction = (ratePct / 100).toString();
  return Money.multiplyByRate(netPricePaisa, rateFraction);
}

export function computeVatAmount(baseAmountPaisa: bigint, vatRatePct = 0): bigint {
  if (vatRatePct < 0) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'VAT rate percentage cannot be negative',
    });
  }
  if (vatRatePct === 0) {
    return 0n;
  }
  const vatFraction = (vatRatePct / 100).toString();
  return Money.multiplyByRate(baseAmountPaisa, vatFraction);
}

export function calculateItemisedCharges(
  netPricePaisa: bigint,
  charges: ChargeItemInput[],
): ChargeCalculationSummary {
  if (netPricePaisa < 0n) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Net price cannot be negative',
    });
  }

  let totalIncludedChargesPaisa = 0n;
  let totalAdditionalChargesPaisa = 0n;
  let totalVatPaisa = 0n;

  const items: CalculatedChargeItem[] = [];

  for (const c of charges) {
    const baseAmountPaisa = computeBaseChargeAmount(
      netPricePaisa,
      c.calculationType,
      c.amountPaisa,
      c.ratePct,
    );

    const vatRatePct = c.vatRatePct ?? 0;
    const vatAmountPaisa = computeVatAmount(baseAmountPaisa, vatRatePct);
    const totalAmountPaisa = Money.add(baseAmountPaisa, vatAmountPaisa);

    const isIncluded = c.isIncludedInNetPrice ?? false;
    const payableStage = c.payableStage ?? 'AT_BOOKING';

    if (isIncluded) {
      totalIncludedChargesPaisa = Money.add(totalIncludedChargesPaisa, baseAmountPaisa);
    } else {
      totalAdditionalChargesPaisa = Money.add(totalAdditionalChargesPaisa, baseAmountPaisa);
    }

    totalVatPaisa = Money.add(totalVatPaisa, vatAmountPaisa);

    items.push({
      name: c.name.trim(),
      chargeTypeCode: c.chargeTypeCode,
      calculationType: c.calculationType,
      baseAmountPaisa,
      baseAmountFormatted: formatMoney(baseAmountPaisa),
      vatRatePct,
      vatAmountPaisa,
      vatAmountFormatted: formatMoney(vatAmountPaisa),
      totalAmountPaisa,
      totalAmountFormatted: formatMoney(totalAmountPaisa),
      isIncludedInNetPrice: isIncluded,
      payableStage,
    });
  }

  const grandTotalPaisa = Money.add(
    Money.add(netPricePaisa, totalAdditionalChargesPaisa),
    totalVatPaisa,
  );

  return {
    netPricePaisa,
    netPriceFormatted: formatMoney(netPricePaisa),
    totalIncludedChargesPaisa,
    totalIncludedChargesFormatted: formatMoney(totalIncludedChargesPaisa),
    totalAdditionalChargesPaisa,
    totalAdditionalChargesFormatted: formatMoney(totalAdditionalChargesPaisa),
    totalVatPaisa,
    totalVatFormatted: formatMoney(totalVatPaisa),
    grandTotalPaisa,
    grandTotalFormatted: formatMoney(grandTotalPaisa),
    items,
  };
}
