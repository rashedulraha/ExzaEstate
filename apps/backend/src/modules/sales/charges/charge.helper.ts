import type { Prisma } from '@prisma/client';
import type {
  ChargeCalculationType,
  ChargeItemInput,
  ChargePayableStage,
} from '../domain/charge-calculation-engine.js';
import type {
  ChargeCalculationItemDto,
  CreateChargeTypeDto,
  UpdateChargeTypeDto,
} from '../dto/index.js';

interface RawChargeTypeRecord {
  id: string;
  code: string;
  name: string;
  calculationType: string;
  defaultAmountPaisa: bigint | null;
  defaultRatePct: { toString(): string } | number | null;
  isIncludedInNetPrice: boolean;
  payableStage: string;
  vatRatePct: { toString(): string } | number;
}

const DEFAULT_CREATE_CHARGE_TYPE = {
  description: null,
  calculationType: 'FIXED',
  defaultAmountPaisa: null,
  defaultRatePct: null,
  isIncludedInNetPrice: false,
  payableStage: 'AT_BOOKING',
  vatRatePct: 0.0,
  accountCode: null,
  isActive: true,
};

export function buildCreateChargeTypeData(
  companyId: string,
  code: string,
  dto: CreateChargeTypeDto,
  userId?: string,
): Prisma.ChargeTypeCreateInput {
  const raw: Record<string, unknown> = {
    ...DEFAULT_CREATE_CHARGE_TYPE,
    companyId,
    code,
    name: dto.name.trim(),
    createdById: userId || null,
    updatedById: userId || null,
  };

  for (const [key, val] of Object.entries(dto)) {
    if (val !== undefined && key !== 'name' && key !== 'code') {
      raw[key] = val;
    }
  }

  if (dto.defaultAmountPaisa) {
    raw.defaultAmountPaisa = BigInt(dto.defaultAmountPaisa);
  }
  if (dto.description) {
    raw.description = dto.description.trim();
  }

  return raw as unknown as Prisma.ChargeTypeCreateInput;
}

export function buildUpdateChargeTypeData(
  dto: UpdateChargeTypeDto,
  userId?: string,
): Prisma.ChargeTypeUpdateInput {
  const data: Record<string, unknown> = {
    updatedById: userId || null,
  };

  for (const [key, val] of Object.entries(dto)) {
    if (val !== undefined) {
      data[key] = val;
    }
  }

  if (dto.name) {
    data.name = dto.name.trim();
  }
  if (dto.description) {
    data.description = dto.description.trim();
  }
  if (dto.defaultAmountPaisa !== undefined) {
    data.defaultAmountPaisa = dto.defaultAmountPaisa ? BigInt(dto.defaultAmountPaisa) : null;
  }

  return data as Prisma.ChargeTypeUpdateInput;
}

function resolveChargeAmount(
  dtoAmount: string | undefined,
  chargeType: RawChargeTypeRecord | null | undefined,
): bigint | undefined {
  if (dtoAmount !== undefined) {
    return BigInt(dtoAmount);
  }
  return chargeType?.defaultAmountPaisa ?? undefined;
}

function resolveChargeRate(
  dtoRate: number | undefined,
  chargeType: RawChargeTypeRecord | null | undefined,
): number | undefined {
  if (dtoRate !== undefined) {
    return dtoRate;
  }
  if (
    !chargeType ||
    chargeType.defaultRatePct === null ||
    chargeType.defaultRatePct === undefined
  ) {
    return undefined;
  }
  return Number(chargeType.defaultRatePct);
}

function resolveVatRate(
  dtoVat: number | undefined,
  chargeType: RawChargeTypeRecord | null | undefined,
): number | undefined {
  if (dtoVat !== undefined) {
    return dtoVat;
  }
  return chargeType ? Number(chargeType.vatRatePct) : undefined;
}

function resolveChargeName(
  dtoName: string | undefined,
  chargeType: RawChargeTypeRecord | null | undefined,
): string {
  if (dtoName) return dtoName;
  if (chargeType) return chargeType.name;
  return 'Unknown Charge';
}

function resolveCalculationType(
  dtoType: string | undefined,
  chargeType: RawChargeTypeRecord | null | undefined,
): ChargeCalculationType {
  if (dtoType) return dtoType as ChargeCalculationType;
  if (chargeType) return chargeType.calculationType as ChargeCalculationType;
  return 'FIXED';
}

function resolvePayableStage(
  dtoStage: string | undefined,
  chargeType: RawChargeTypeRecord | null | undefined,
): ChargePayableStage {
  if (dtoStage) return dtoStage as ChargePayableStage;
  if (chargeType) return chargeType.payableStage as ChargePayableStage;
  return 'AT_BOOKING';
}

function resolveIncludedInNetPrice(
  dtoIncluded: boolean | undefined,
  chargeType: RawChargeTypeRecord | null | undefined,
): boolean {
  if (dtoIncluded !== undefined) return dtoIncluded;
  if (chargeType) return chargeType.isIncludedInNetPrice;
  return false;
}

export function resolveChargeItemInput(
  dtoItem: ChargeCalculationItemDto,
  chargeType?: RawChargeTypeRecord | null,
): ChargeItemInput {
  return {
    name: resolveChargeName(dtoItem.name, chargeType),
    chargeTypeCode: dtoItem.chargeTypeCode || chargeType?.code,
    calculationType: resolveCalculationType(dtoItem.calculationType, chargeType),
    amountPaisa: resolveChargeAmount(dtoItem.amountPaisa, chargeType),
    ratePct: resolveChargeRate(dtoItem.ratePct, chargeType),
    isIncludedInNetPrice: resolveIncludedInNetPrice(dtoItem.isIncludedInNetPrice, chargeType),
    payableStage: resolvePayableStage(dtoItem.payableStage, chargeType),
    vatRatePct: resolveVatRate(dtoItem.vatRatePct, chargeType),
  };
}
