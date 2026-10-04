import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import {
  calculateItemisedCharges,
  type ChargeItemInput,
} from '../domain/charge-calculation-engine.js';
import type {
  CalculateChargesDto,
  ChargeCalculationSummaryResponseDto,
  ChargeTypeListResponseDto,
  ChargeTypeResponseDto,
  CreateChargeTypeDto,
  QueryChargeTypesDto,
  UpdateChargeTypeDto,
} from '../dto/index.js';
import {
  buildCreateChargeTypeData,
  buildUpdateChargeTypeData,
  resolveChargeItemInput,
} from './charge.helper.js';
import { mapCalculationSummaryToDto, mapChargeTypeToDto } from './charge.mapper.js';

@Injectable()
export class ChargeService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
  ) {}

  async calculateCharges(
    companyId: string,
    dto: CalculateChargesDto,
  ): Promise<ChargeCalculationSummaryResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const typeIds = dto.charges
        .map((c) => c.chargeTypeId)
        .filter((id): id is string => Boolean(id));

      const chargeTypes =
        typeIds.length > 0
          ? await tx.chargeType.findMany({
              where: { id: { in: typeIds }, companyId, deletedAt: null },
            })
          : [];

      const typeMap = new Map(chargeTypes.map((ct) => [ct.id, ct]));

      for (const id of typeIds) {
        if (!typeMap.has(id)) {
          throw new NotFoundException({
            code: ERROR_CODES.NOT_FOUND,
            message: `Charge type not found: ${id}`,
          });
        }
      }

      const resolvedItems: ChargeItemInput[] = dto.charges.map((item) => {
        const ct = item.chargeTypeId ? typeMap.get(item.chargeTypeId) : null;
        return resolveChargeItemInput(item, ct);
      });

      const netPricePaisa = BigInt(dto.netPricePaisa);
      const summary = calculateItemisedCharges(netPricePaisa, resolvedItems);
      return mapCalculationSummaryToDto(summary);
    });
  }

  async createChargeType(
    companyId: string,
    dto: CreateChargeTypeDto,
    userId?: string,
  ): Promise<ChargeTypeResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const code = dto.code.trim().toUpperCase();

      const existing = await tx.chargeType.findFirst({
        where: { companyId, code, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: `Charge type with code "${code}" already exists`,
        });
      }

      const data = buildCreateChargeTypeData(companyId, code, dto, userId);
      const chargeType = await tx.chargeType.create({ data });

      await this.auditService.record(tx, {
        action: 'CHARGE_TYPE_CREATED',
        module: 'sales',
        recordType: 'ChargeType',
        recordId: chargeType.id,
        after: { code, name: chargeType.name, calculationType: chargeType.calculationType },
      });

      return mapChargeTypeToDto(chargeType);
    });
  }

  async getChargeTypes(
    companyId: string,
    query: QueryChargeTypesDto,
  ): Promise<ChargeTypeListResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = query.page && query.page > 0 ? query.page : 1;
      const limit = query.limit && query.limit > 0 ? query.limit : 50;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {
        companyId,
        deletedAt: null,
      };

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }
      if (query.payableStage !== undefined) {
        where.payableStage = query.payableStage;
      }
      if (query.isIncludedInNetPrice !== undefined) {
        where.isIncludedInNetPrice = query.isIncludedInNetPrice;
      }
      if (query.search?.trim()) {
        const search = query.search.trim();
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        tx.chargeType.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          skip,
          take: limit,
        }),
        tx.chargeType.count({ where }),
      ]);

      return {
        items: items.map(mapChargeTypeToDto),
        total,
        page,
        limit,
      };
    });
  }

  async getChargeTypeById(companyId: string, id: string): Promise<ChargeTypeResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const chargeType = await tx.chargeType.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!chargeType) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Charge type "${id}" not found`,
        });
      }
      return mapChargeTypeToDto(chargeType);
    });
  }

  async updateChargeType(
    companyId: string,
    id: string,
    dto: UpdateChargeTypeDto,
    userId?: string,
  ): Promise<ChargeTypeResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.chargeType.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Charge type "${id}" not found`,
        });
      }

      const updateData = buildUpdateChargeTypeData(dto, userId);
      const updated = await tx.chargeType.update({
        where: { id },
        data: updateData,
      });

      await this.auditService.record(tx, {
        action: 'CHARGE_TYPE_UPDATED',
        module: 'sales',
        recordType: 'ChargeType',
        recordId: id,
        before: { name: existing.name, isActive: existing.isActive },
        after: { name: updated.name, isActive: updated.isActive },
      });

      return mapChargeTypeToDto(updated);
    });
  }

  async deleteChargeType(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.chargeType.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Charge type "${id}" not found`,
        });
      }

      await tx.chargeType.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: userId || null,
        },
      });

      await this.auditService.record(tx, {
        action: 'CHARGE_TYPE_DELETED',
        module: 'sales',
        recordType: 'ChargeType',
        recordId: id,
        before: { code: existing.code, name: existing.name },
      });

      return { success: true, id };
    });
  }
}
