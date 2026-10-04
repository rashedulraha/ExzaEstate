import { COMMISSION_CALC_TYPE } from './commission.constants.js';

export interface CommissionCalculationInput {
  calculationType: string;
  percentage?: number | null;
  fixedAmountPaisa?: bigint | null;
  netPricePaisa: bigint;
  totalPaidPaisa?: bigint;
}

export function calculateCommissionAmount(input: CommissionCalculationInput): bigint {
  if (input.calculationType === COMMISSION_CALC_TYPE.FIXED_AMOUNT) {
    return input.fixedAmountPaisa ?? 0n;
  }

  const pct = input.percentage ? Number(input.percentage) : 0;
  if (pct <= 0) return 0n;

  if (input.calculationType === COMMISSION_CALC_TYPE.PERCENT_COLLECTED) {
    const base = input.totalPaidPaisa ?? 0n;
    return (base * BigInt(Math.round(pct * 100))) / 10000n;
  }

  // Default: PERCENT_NET_PRICE
  return (input.netPricePaisa * BigInt(Math.round(pct * 100))) / 10000n;
}
