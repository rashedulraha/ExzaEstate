import { Decimal } from '@prisma/client/runtime/client.js';
import type { Prisma } from '@prisma/client';
import { calculateNetPrice } from './domain/property-pricing.js';
import type { TransitionParams } from './domain/property-status-machine.js';
import type { CreatePropertyDto } from './dto/create-property.dto.js';
import type { PropertyResponseDto } from './dto/property-response.dto.js';
import type { QueryPropertyDto } from './dto/query-property.dto.js';
import type { UpdatePropertyDto } from './dto/update-property.dto.js';

export const PROPERTY_INCLUDE = {
  block: { select: { id: true, code: true, name: true } },
  floor: { select: { id: true, code: true, name: true, floorNumber: true } },
} as const;

type PropertyWithRelations = Prisma.PropertyGetPayload<{
  include: typeof PROPERTY_INCLUDE;
}>;

export function formatPropertyResponse(p: PropertyWithRelations): PropertyResponseDto {
  const areaSqftStr = p.areaSqft instanceof Decimal ? p.areaSqft.toFixed(4) : String(p.areaSqft);
  const discountLimitPctStr =
    p.discountLimitPct instanceof Decimal
      ? p.discountLimitPct.toFixed(2)
      : String(p.discountLimitPct);

  return {
    id: p.id,
    companyId: p.companyId,
    projectId: p.projectId,
    blockId: p.blockId,
    floorId: p.floorId,
    code: p.code,
    title: p.title,
    type: p.type,
    status: p.status,
    areaSqft: areaSqftStr,
    facing: p.facing,
    basePricePaisa: p.basePricePaisa.toString(),
    premiumPaisa: p.premiumPaisa.toString(),
    discountLimitPct: discountLimitPctStr,
    netPricePaisa: p.netPricePaisa.toString(),
    ownerType: p.ownerType,
    holdExpiresAt: p.holdExpiresAt?.toISOString() ?? null,
    blockReason: p.blockReason,
    description: p.description,
    metadata: (p.metadata as Record<string, unknown>) ?? null,
    block: p.block
      ? {
          id: p.block.id,
          code: p.block.code,
          name: p.block.name,
        }
      : null,
    floor: p.floor
      ? {
          id: p.floor.id,
          code: p.floor.code,
          name: p.floor.name,
          floorNumber: p.floor.floorNumber,
        }
      : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function buildPropertyCreateData(
  companyId: string,
  dto: CreatePropertyDto,
  basePrice: bigint,
  premium: bigint,
  userId?: string,
): Prisma.PropertyUncheckedCreateInput {
  const netPrice = calculateNetPrice(basePrice, premium);

  return {
    companyId,
    projectId: dto.projectId,
    code: dto.code.trim(),
    title: dto.title?.trim(),
    type: dto.type,
    status: 'Available',
    areaSqft: dto.areaSqft,
    facing: dto.facing,
    basePricePaisa: basePrice,
    premiumPaisa: premium,
    discountLimitPct: dto.discountLimitPct,
    netPricePaisa: netPrice,
    ownerType: dto.ownerType,
    blockId: dto.blockId,
    floorId: dto.floorId,
    description: dto.description,
    metadata: dto.metadata as Prisma.InputJsonValue,
    createdById: userId,
    updatedById: userId,
  };
}

function assignLocationAndMeta(
  data: Prisma.PropertyUncheckedUpdateInput,
  dto: UpdatePropertyDto,
): void {
  if (dto.blockId !== undefined) data.blockId = dto.blockId;
  if (dto.floorId !== undefined) data.floorId = dto.floorId;
  if (dto.ownerType !== undefined) data.ownerType = dto.ownerType;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.metadata !== undefined) data.metadata = dto.metadata as Prisma.InputJsonValue;
}

function assignPropertyDetails(
  data: Prisma.PropertyUncheckedUpdateInput,
  dto: UpdatePropertyDto,
): void {
  if (dto.title !== undefined) data.title = dto.title;
  if (dto.type !== undefined) data.type = dto.type;
  if (dto.areaSqft !== undefined) data.areaSqft = dto.areaSqft;
  if (dto.facing !== undefined) data.facing = dto.facing;
  if (dto.discountLimitPct !== undefined) data.discountLimitPct = dto.discountLimitPct;
}

export function buildPropertyUpdateData(
  dto: UpdatePropertyDto,
  existing: { basePricePaisa: bigint; premiumPaisa: bigint },
  userId?: string,
): Prisma.PropertyUncheckedUpdateInput {
  const basePrice =
    dto.basePricePaisa !== undefined ? BigInt(dto.basePricePaisa) : existing.basePricePaisa;
  const premium = dto.premiumPaisa !== undefined ? BigInt(dto.premiumPaisa) : existing.premiumPaisa;
  const netPricePaisa = calculateNetPrice(basePrice, premium);

  const data: Prisma.PropertyUncheckedUpdateInput = {
    basePricePaisa: basePrice,
    premiumPaisa: premium,
    netPricePaisa,
    ...(userId ? { updatedById: userId } : {}),
  };

  assignPropertyDetails(data, dto);
  assignLocationAndMeta(data, dto);

  return data;
}

export function buildTransitionUpdateData(params: TransitionParams): Prisma.PropertyUpdateInput {
  const data: Prisma.PropertyUpdateInput = {
    status: params.toStatus,
    ...(params.userId && { updatedById: params.userId }),
  };
  if (params.holdExpiresAt !== undefined) data.holdExpiresAt = params.holdExpiresAt;
  if (params.blockReason !== undefined) data.blockReason = params.blockReason;
  return data;
}

function applyPriceAndSearchFilters(
  where: Prisma.PropertyWhereInput,
  query: QueryPropertyDto,
): void {
  if (query.minPricePaisa) {
    where.netPricePaisa = {
      ...(where.netPricePaisa as Prisma.BigIntFilter),
      gte: BigInt(query.minPricePaisa),
    };
  }
  if (query.maxPricePaisa) {
    where.netPricePaisa = {
      ...(where.netPricePaisa as Prisma.BigIntFilter),
      lte: BigInt(query.maxPricePaisa),
    };
  }
  if (query.search?.trim()) {
    const s = query.search.trim();
    where.OR = [
      { code: { contains: s, mode: 'insensitive' } },
      { title: { contains: s, mode: 'insensitive' } },
    ];
  }
}

export function buildPropertyWhereClause(
  companyId: string,
  query: QueryPropertyDto,
): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {
    companyId,
    deletedAt: null,
  };

  if (query.projectId) where.projectId = query.projectId;
  if (query.blockId) where.blockId = query.blockId;
  if (query.floorId) where.floorId = query.floorId;
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.facing) where.facing = query.facing;

  applyPriceAndSearchFilters(where, query);
  return where;
}
