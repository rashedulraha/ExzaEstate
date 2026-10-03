import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DEFAULT_LAND_UNIT_FACTORS, ERROR_CODES, type LandUnitFactors } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { CreateLandDto, QueryLandDto, UpdateLandDto } from './dto/land.dto.js';
import {
  buildLandCreateInput,
  buildLandUpdateInput,
  formatLandOutput,
  type LandRecord,
} from './land-calculator.util.js';

@Injectable()
export class LandService {
  constructor(private readonly tenantDb: TenantDb) {}

  async createLand(companyId: string, dto: CreateLandDto, userId?: string) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const code = dto.code ? dto.code.trim() : await this.generateNextLandCode(tx, companyId);

      const existingCode = await tx.land.findFirst({
        where: { companyId, code, deletedAt: null },
      });

      if (existingCode) {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: `Land with code ${code} already exists`,
        });
      }

      const factors = await this.getCompanyLandFactors(tx, companyId);
      const createInput = buildLandCreateInput(companyId, code, dto, factors);

      if (userId) {
        createInput.createdById = userId;
        createInput.updatedById = userId;
      }

      const created = (await tx.land.create({
        data: createInput,
      })) as LandRecord;

      return formatLandOutput(created, factors);
    });
  }

  async updateLand(companyId: string, id: string, dto: UpdateLandDto, userId?: string) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = (await tx.land.findUnique({
        where: { id, companyId, deletedAt: null },
      })) as LandRecord | null;

      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Land parcel not found',
        });
      }

      if (dto.code && dto.code.trim() !== existing.code) {
        const conflict = await tx.land.findFirst({
          where: { companyId, code: dto.code.trim(), deletedAt: null },
        });
        if (conflict) {
          throw new ConflictException({
            code: ERROR_CODES.CONFLICT,
            message: `Land with code ${dto.code.trim()} already exists`,
          });
        }
      }

      const factors = await this.getCompanyLandFactors(tx, companyId);
      const updateData = buildLandUpdateInput(dto, factors);

      if (userId) {
        updateData.updatedById = userId;
      }

      const updated = (await tx.land.update({
        where: { id, companyId },
        data: updateData,
      })) as LandRecord;

      return formatLandOutput(updated, factors);
    });
  }

  async getLandById(companyId: string, id: string) {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const land = (await tx.land.findUnique({
        where: { id, companyId, deletedAt: null },
      })) as LandRecord | null;

      if (!land) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Land parcel not found',
        });
      }

      const factors = await this.getCompanyLandFactors(tx, companyId);
      return formatLandOutput(land, factors);
    });
  }

  async listLands(companyId: string, query: QueryLandDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const where: Prisma.LandWhereInput = {
        companyId,
        deletedAt: null,
        ...(query.district && { district: { equals: query.district, mode: 'insensitive' } }),
        ...(query.upazila && { upazila: { equals: query.upazila, mode: 'insensitive' } }),
        ...(query.status && { status: query.status }),
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
            { mouza: { contains: query.search, mode: 'insensitive' } },
            { deedNumber: { contains: query.search, mode: 'insensitive' } },
            { khatianNumber: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      };

      const [lands, total, factors] = await Promise.all([
        tx.land.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        tx.land.count({ where }),
        this.getCompanyLandFactors(tx, companyId),
      ]);

      const items = (lands as LandRecord[]).map((l) => formatLandOutput(l, factors));
      return { items, total, page, limit };
    });
  }

  async deleteLand(companyId: string, id: string, userId?: string): Promise<void> {
    await this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.land.findUnique({
        where: { id, companyId, deletedAt: null },
      });

      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Land parcel not found',
        });
      }

      await tx.land.update({
        where: { id, companyId },
        data: {
          deletedAt: new Date(),
          status: 'INACTIVE',
          ...(userId && { updatedById: userId }),
        },
      });
    });
  }

  async getLandFactors(companyId: string): Promise<LandUnitFactors> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      return this.getCompanyLandFactors(tx, companyId);
    });
  }

  async updateCompanyLandFactors(
    companyId: string,
    factors: Partial<LandUnitFactors>,
    _userId?: string,
  ): Promise<LandUnitFactors> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const current = await this.getCompanyLandFactors(tx, companyId);
      const updatedFactors: LandUnitFactors = {
        ...current,
        ...factors,
      };

      await tx.companySetting.upsert({
        where: {
          companyId_key: { companyId, key: 'land_unit_factors' },
        },
        update: {
          value: updatedFactors as Prisma.InputJsonValue,
        },
        create: {
          companyId,
          key: 'land_unit_factors',
          value: updatedFactors as Prisma.InputJsonValue,
        },
      });

      return updatedFactors;
    });
  }

  async getCompanyLandFactors(tx: TenantPrisma, companyId: string): Promise<LandUnitFactors> {
    const setting = await tx.companySetting.findUnique({
      where: {
        companyId_key: { companyId, key: 'land_unit_factors' },
      },
      select: { value: true },
    });

    if (setting && typeof setting.value === 'object' && setting.value !== null) {
      return {
        ...DEFAULT_LAND_UNIT_FACTORS,
        ...(setting.value as Record<string, number | string>),
      };
    }

    return DEFAULT_LAND_UNIT_FACTORS;
  }

  private async generateNextLandCode(tx: TenantPrisma, companyId: string): Promise<string> {
    const count = await tx.land.count({ where: { companyId } });
    const nextSeq = (count + 1).toString().padStart(3, '0');
    return `LND-${nextSeq}`;
  }
}
