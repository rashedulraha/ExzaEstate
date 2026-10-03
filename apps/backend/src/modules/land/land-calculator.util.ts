import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ERROR_CODES,
  convertArea,
  convertCompoundArea,
  fromCanonicalSqFt,
  toCanonicalSqFt,
  type LandUnit,
  type LandUnitFactors,
} from '@exzaestate/shared';
import type { CreateLandDto, UpdateLandDto } from './dto/land.dto.js';

export interface LandRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  district: string;
  upazila: string;
  mouza: string;
  jlNumber: string | null;
  khatianNumber: string | null;
  dagNumber: string | null;
  deedNumber: string | null;
  deedDate: Date | null;
  recordedOwners: string | null;
  areaSqft: Prisma.Decimal;
  enteredArea: Prisma.Decimal | null;
  enteredUnit: string | null;
  purchasePricePaisa: bigint | null;
  legalCostPaisa: bigint | null;
  developmentCostPaisa: bigint | null;
  mutationStatus: string | null;
  taxStatus: string | null;
  ownershipStatus: string | null;
  status: string;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function resolveAreaSqft(
  dto: {
    areaSqft?: number | string;
    enteredArea?: number | string;
    enteredUnit?: string;
    compoundArea?: Array<{ value: number | string; unit: string }>;
  },
  factors: LandUnitFactors,
): { areaSqft: string; enteredArea: string | null; enteredUnit: string | null } {
  if (dto.compoundArea && dto.compoundArea.length > 0) {
    const canonical = convertCompoundArea(
      dto.compoundArea.map((p) => ({ value: p.value, unit: p.unit as LandUnit })),
      factors,
    );
    const summaryUnit = dto.compoundArea.map((p) => `${p.value} ${p.unit}`).join(' + ');
    return {
      areaSqft: canonical,
      enteredArea: null,
      enteredUnit: summaryUnit,
    };
  }

  if (dto.enteredArea !== undefined && dto.enteredUnit) {
    const canonical = convertArea(dto.enteredArea, dto.enteredUnit as LandUnit, factors);
    return {
      areaSqft: canonical,
      enteredArea: dto.enteredArea.toString(),
      enteredUnit: dto.enteredUnit,
    };
  }

  if (dto.areaSqft !== undefined) {
    const canonical = toCanonicalSqFt(dto.areaSqft, 'SQFT', factors);
    return {
      areaSqft: canonical,
      enteredArea: dto.areaSqft.toString(),
      enteredUnit: 'SQFT',
    };
  }

  throw new BadRequestException({
    code: ERROR_CODES.VALIDATION_ERROR,
    message: 'Land area is required (specify areaSqft, enteredArea + enteredUnit, or compoundArea)',
  });
}

function parsePaisa(val?: string | number | null): bigint | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return BigInt(Math.round(val));
  return BigInt(val.toString().trim());
}

function trimOrNull(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDecimal(val?: number | string | null): Prisma.Decimal | null {
  if (val === undefined || val === null || val === '') return null;
  return new Prisma.Decimal(val.toString());
}

function parseDate(val?: string | Date | null): Date | null {
  if (!val) return null;
  return new Date(val);
}

function extractDeedInfo(dto: CreateLandDto | UpdateLandDto) {
  return {
    jlNumber: trimOrNull(dto.jlNumber),
    khatianNumber: trimOrNull(dto.khatianNumber),
    dagNumber: trimOrNull(dto.dagNumber),
    deedNumber: trimOrNull(dto.deedNumber),
    deedDate: parseDate(dto.deedDate),
    recordedOwners: trimOrNull(dto.recordedOwners),
  };
}

function extractCosts(dto: CreateLandDto | UpdateLandDto) {
  return {
    purchasePricePaisa: parsePaisa(dto.purchasePricePaisa),
    legalCostPaisa: parsePaisa(dto.legalCostPaisa),
    developmentCostPaisa: parsePaisa(dto.developmentCostPaisa),
  };
}

function extractStatuses(dto: CreateLandDto | UpdateLandDto) {
  return {
    mutationStatus: trimOrNull(dto.mutationStatus),
    taxStatus: trimOrNull(dto.taxStatus),
    ownershipStatus: trimOrNull(dto.ownershipStatus),
    remarks: trimOrNull(dto.remarks),
  };
}

export function buildLandCreateInput(
  companyId: string,
  code: string,
  dto: CreateLandDto,
  factors: LandUnitFactors,
): Prisma.LandUncheckedCreateInput {
  const areaInfo = resolveAreaSqft(dto, factors);

  return {
    companyId,
    name: dto.name.trim(),
    code: code.trim(),
    district: dto.district.trim(),
    upazila: dto.upazila.trim(),
    mouza: dto.mouza.trim(),
    areaSqft: new Prisma.Decimal(areaInfo.areaSqft),
    enteredArea: areaInfo.enteredArea ? new Prisma.Decimal(areaInfo.enteredArea) : null,
    enteredUnit: areaInfo.enteredUnit,
    status: trimOrNull(dto.status) ?? 'ACTIVE',
    latitude: parseDecimal(dto.latitude),
    longitude: parseDecimal(dto.longitude),
    ...extractDeedInfo(dto),
    ...extractCosts(dto),
    ...extractStatuses(dto),
  };
}

function applyIdentityUpdates(update: Record<string, unknown>, dto: UpdateLandDto): void {
  if (dto.name !== undefined) update.name = dto.name.trim();
  if (dto.code !== undefined) update.code = dto.code.trim();
  if (dto.district !== undefined) update.district = dto.district.trim();
  if (dto.upazila !== undefined) update.upazila = dto.upazila.trim();
  if (dto.mouza !== undefined) update.mouza = dto.mouza.trim();
  if (dto.status !== undefined) update.status = dto.status.trim();
}

function applyDeedUpdates(update: Record<string, unknown>, dto: UpdateLandDto): void {
  if (dto.jlNumber !== undefined) update.jlNumber = dto.jlNumber;
  if (dto.khatianNumber !== undefined) update.khatianNumber = dto.khatianNumber;
  if (dto.dagNumber !== undefined) update.dagNumber = dto.dagNumber;
  if (dto.deedNumber !== undefined) update.deedNumber = dto.deedNumber;
  if (dto.deedDate !== undefined) update.deedDate = parseDate(dto.deedDate);
  if (dto.recordedOwners !== undefined) update.recordedOwners = dto.recordedOwners;
}

function applyFinancialUpdates(update: Record<string, unknown>, dto: UpdateLandDto): void {
  if (dto.purchasePricePaisa !== undefined)
    update.purchasePricePaisa = parsePaisa(dto.purchasePricePaisa);
  if (dto.legalCostPaisa !== undefined) update.legalCostPaisa = parsePaisa(dto.legalCostPaisa);
  if (dto.developmentCostPaisa !== undefined)
    update.developmentCostPaisa = parsePaisa(dto.developmentCostPaisa);
}

function applyMiscUpdates(update: Record<string, unknown>, dto: UpdateLandDto): void {
  if (dto.mutationStatus !== undefined) update.mutationStatus = dto.mutationStatus;
  if (dto.taxStatus !== undefined) update.taxStatus = dto.taxStatus;
  if (dto.ownershipStatus !== undefined) update.ownershipStatus = dto.ownershipStatus;
  if (dto.remarks !== undefined) update.remarks = dto.remarks;
  if (dto.latitude !== undefined) update.latitude = parseDecimal(dto.latitude);
  if (dto.longitude !== undefined) update.longitude = parseDecimal(dto.longitude);
}

function applyAreaUpdate(
  update: Record<string, unknown>,
  dto: UpdateLandDto,
  factors: LandUnitFactors,
): void {
  const hasArea =
    dto.areaSqft !== undefined || dto.enteredArea !== undefined || dto.compoundArea !== undefined;
  if (!hasArea) return;

  const areaInfo = resolveAreaSqft(dto, factors);
  update.areaSqft = new Prisma.Decimal(areaInfo.areaSqft);
  update.enteredArea = areaInfo.enteredArea ? new Prisma.Decimal(areaInfo.enteredArea) : null;
  update.enteredUnit = areaInfo.enteredUnit;
}

export function buildLandUpdateInput(
  dto: UpdateLandDto,
  factors: LandUnitFactors,
): Prisma.LandUpdateInput {
  const update: Record<string, unknown> = {};
  applyIdentityUpdates(update, dto);
  applyDeedUpdates(update, dto);
  applyFinancialUpdates(update, dto);
  applyMiscUpdates(update, dto);
  applyAreaUpdate(update, dto, factors);
  return update as Prisma.LandUpdateInput;
}

export function formatLandOutput(land: LandRecord, factors: LandUnitFactors) {
  const sqftStr = new Prisma.Decimal(land.areaSqft).toFixed(4);

  return {
    ...land,
    areaSqft: sqftStr,
    enteredArea: land.enteredArea ? land.enteredArea.toString() : null,
    purchasePricePaisa:
      land.purchasePricePaisa !== null ? land.purchasePricePaisa.toString() : null,
    legalCostPaisa: land.legalCostPaisa !== null ? land.legalCostPaisa.toString() : null,
    developmentCostPaisa:
      land.developmentCostPaisa !== null ? land.developmentCostPaisa.toString() : null,
    latitude: land.latitude !== null ? Number(land.latitude) : null,
    longitude: land.longitude !== null ? Number(land.longitude) : null,
    conversions: {
      sqft: sqftStr,
      katha: fromCanonicalSqFt(sqftStr, 'KATHA', factors),
      decimal: fromCanonicalSqFt(sqftStr, 'DECIMAL', factors),
      bigha: fromCanonicalSqFt(sqftStr, 'BIGHA', factors),
      acre: fromCanonicalSqFt(sqftStr, 'ACRE', factors),
    },
  };
}
