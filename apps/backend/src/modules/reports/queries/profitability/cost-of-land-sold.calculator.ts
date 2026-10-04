export interface CostOfLandSoldInput {
  sqFtSold: number;
  totalSaleableSqFt: number;
  projectWipBalancePaisa: bigint;
}

/**
 * Calculates Cost of Land Sold (COGS) allocation on handover:
 * Formula: (sq ft sold ÷ total saleable sq ft) × project WIP balance (accounting-rules.md §3.10)
 */
export function calculateCostOfLandSold(input: CostOfLandSoldInput): bigint {
  if (
    input.totalSaleableSqFt <= 0 ||
    input.sqFtSold <= 0 ||
    input.projectWipBalancePaisa <= 0n
  ) {
    return 0n;
  }

  if (input.sqFtSold >= input.totalSaleableSqFt) {
    return input.projectWipBalancePaisa;
  }

  // 4 decimal places precision (basis points: 10,000)
  const ratioBps = BigInt(Math.round((input.sqFtSold / input.totalSaleableSqFt) * 10_000));
  return (input.projectWipBalancePaisa * ratioBps) / 10_000n;
}
