import { formatMoney } from '@exzaestate/shared';
import type { ChargeCalculationSummary } from '../domain/charge-calculation-engine.js';
import type {
  CalculatedChargeItemResponseDto,
  ChargeCalculationSummaryResponseDto,
  ChargeTypeResponseDto,
} from '../dto/index.js';

interface RawChargeTypeRecord {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  calculationType: string;
  defaultAmountPaisa: bigint | null;
  defaultRatePct: { toString(): string } | number | null;
  isIncludedInNetPrice: boolean;
  payableStage: string;
  vatRatePct: { toString(): string } | number;
  accountCode: string | null;
  isActive: boolean;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapChargeTypeToDto(record: RawChargeTypeRecord): ChargeTypeResponseDto {
  const defaultAmountPaisaStr =
    record.defaultAmountPaisa !== null ? record.defaultAmountPaisa.toString() : null;
  const defaultAmountFormatted =
    record.defaultAmountPaisa !== null ? formatMoney(record.defaultAmountPaisa) : null;
  const defaultRatePct = record.defaultRatePct !== null ? Number(record.defaultRatePct) : null;

  return {
    id: record.id,
    companyId: record.companyId,
    code: record.code,
    name: record.name,
    description: record.description,
    calculationType: record.calculationType,
    defaultAmountPaisa: defaultAmountPaisaStr,
    defaultAmountFormatted,
    defaultRatePct,
    isIncludedInNetPrice: record.isIncludedInNetPrice,
    payableStage: record.payableStage,
    vatRatePct: Number(record.vatRatePct),
    accountCode: record.accountCode,
    isActive: record.isActive,
    createdById: record.createdById,
    updatedById: record.updatedById,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapCalculationSummaryToDto(
  summary: ChargeCalculationSummary,
): ChargeCalculationSummaryResponseDto {
  const items: CalculatedChargeItemResponseDto[] = summary.items.map((it) => ({
    name: it.name,
    chargeTypeCode: it.chargeTypeCode,
    calculationType: it.calculationType,
    baseAmountPaisa: it.baseAmountPaisa.toString(),
    baseAmountFormatted: it.baseAmountFormatted,
    vatRatePct: it.vatRatePct,
    vatAmountPaisa: it.vatAmountPaisa.toString(),
    vatAmountFormatted: it.vatAmountFormatted,
    totalAmountPaisa: it.totalAmountPaisa.toString(),
    totalAmountFormatted: it.totalAmountFormatted,
    isIncludedInNetPrice: it.isIncludedInNetPrice,
    payableStage: it.payableStage,
  }));

  return {
    netPricePaisa: summary.netPricePaisa.toString(),
    netPriceFormatted: summary.netPriceFormatted,
    totalIncludedChargesPaisa: summary.totalIncludedChargesPaisa.toString(),
    totalIncludedChargesFormatted: summary.totalIncludedChargesFormatted,
    totalAdditionalChargesPaisa: summary.totalAdditionalChargesPaisa.toString(),
    totalAdditionalChargesFormatted: summary.totalAdditionalChargesFormatted,
    totalVatPaisa: summary.totalVatPaisa.toString(),
    totalVatFormatted: summary.totalVatFormatted,
    grandTotalPaisa: summary.grandTotalPaisa.toString(),
    grandTotalFormatted: summary.grandTotalFormatted,
    items,
  };
}
