import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import {
  buildPropertyCreateData,
  buildPropertyUpdateData,
  buildPropertyWhereClause,
  formatPropertyResponse,
} from './property-builder.util.js';
import { PROPERTY_EVENTS } from './property.events.js';
import type { CreatePropertyDto } from './dto/create-property.dto.js';
import type {
  PaginatedPropertyResponseDto,
  PropertyResponseDto,
} from './dto/property-response.dto.js';
import type { QueryPropertyDto } from './dto/query-property.dto.js';
import type { UpdatePropertyDto } from './dto/update-property.dto.js';

const PROPERTY_INCLUDE = {
  block: { select: { id: true, code: true, name: true } },
  floor: { select: { id: true, code: true, name: true, floorNumber: true } },
} as const;

@Injectable()
export class PropertyService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  async createProperty(
    companyId: string,
    dto: CreatePropertyDto,
    userId?: string,
  ): Promise<PropertyResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await this.validateHierarchyLinks(tx, companyId, dto);

      const existing = await tx.property.findFirst({
        where: { companyId, projectId: dto.projectId, code: dto.code.trim(), deletedAt: null },
      });
      if (existing) {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: `Property with code "${dto.code}" already exists in this project`,
        });
      }

      const basePrice = BigInt(dto.basePricePaisa);
      const premium = dto.premiumPaisa ? BigInt(dto.premiumPaisa) : 0n;
      const createData = buildPropertyCreateData(companyId, dto, basePrice, premium, userId);

      const property = await tx.property.create({
        data: createData,
        include: PROPERTY_INCLUDE,
      });

      await tx.propertyStatusHistory.create({
        data: {
          companyId,
          propertyId: property.id,
          fromStatus: null,
          toStatus: 'Available',
          reason: 'Initial unit creation',
          changedById: userId ?? null,
        },
      });

      const formatted = formatPropertyResponse(property);
      await this.auditService.record(tx, {
        action: 'PROPERTY_CREATED',
        entity: 'Property',
        entityId: property.id,
        after: formatted as unknown as Record<string, unknown>,
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, PROPERTY_EVENTS.CREATED, {
          propertyId: property.id,
          companyId,
          projectId: property.projectId,
          code: property.code,
          type: property.type,
          status: property.status,
          netPricePaisa: property.netPricePaisa.toString(),
          createdById: userId,
          timestamp: new Date().toISOString(),
        });
      }

      return formatted;
    });
  }

  async updateProperty(
    companyId: string,
    id: string,
    dto: UpdatePropertyDto,
    userId?: string,
  ): Promise<PropertyResponseDto> {
    if ('status' in dto && (dto as Record<string, unknown>).status !== undefined) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message:
          'Property status cannot be modified via generic update. Use status transition actions or override endpoint (RULE-PROPERTY-STATUS).',
      });
    }

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.property.findFirst({
        where: { id, companyId, deletedAt: null },
        include: PROPERTY_INCLUDE,
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Property not found',
        });
      }

      const updateData = buildPropertyUpdateData(dto, existing, userId);
      const updated = await tx.property.update({
        where: { id },
        data: updateData,
        include: PROPERTY_INCLUDE,
      });

      const formattedBefore = formatPropertyResponse(existing);
      const formattedAfter = formatPropertyResponse(updated);

      await this.auditService.record(tx, {
        action: 'PROPERTY_UPDATED',
        entity: 'Property',
        entityId: id,
        before: formattedBefore as unknown as Record<string, unknown>,
        after: formattedAfter as unknown as Record<string, unknown>,
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, PROPERTY_EVENTS.UPDATED, {
          propertyId: id,
          companyId,
          projectId: updated.projectId,
          code: updated.code,
          updatedById: userId,
          timestamp: new Date().toISOString(),
        });
      }

      return formattedAfter;
    });
  }

  async listProperties(
    companyId: string,
    query: QueryPropertyDto,
  ): Promise<PaginatedPropertyResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const where = buildPropertyWhereClause(companyId, query);
      const sortBy = query.sortBy ?? 'code';
      const sortOrder = query.sortOrder ?? 'asc';

      const [items, total] = await Promise.all([
        tx.property.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: PROPERTY_INCLUDE,
        }),
        tx.property.count({ where }),
      ]);

      return {
        items: items.map(formatPropertyResponse),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    });
  }

  async getPropertyById(companyId: string, id: string): Promise<PropertyResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const property = await tx.property.findFirst({
        where: { id, companyId, deletedAt: null },
        include: PROPERTY_INCLUDE,
      });
      if (!property) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Property not found',
        });
      }
      return formatPropertyResponse(property);
    });
  }

  async deleteProperty(companyId: string, id: string, userId?: string): Promise<void> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const property = await tx.property.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!property) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Property not found',
        });
      }

      if (['Booked', 'Sold', 'Reserved'].includes(property.status)) {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: `Cannot delete property in active status "${property.status}"`,
        });
      }

      await tx.property.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          ...(userId && { updatedById: userId }),
        },
      });

      await this.auditService.record(tx, {
        action: 'PROPERTY_DELETED',
        entity: 'Property',
        entityId: id,
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, PROPERTY_EVENTS.DELETED, {
          propertyId: id,
          companyId,
          deletedById: userId,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  private async validateHierarchyLinks(
    tx: TenantPrisma,
    companyId: string,
    dto: CreatePropertyDto,
  ): Promise<void> {
    const project = await tx.project.findFirst({
      where: { id: dto.projectId, companyId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException({ code: ERROR_CODES.NOT_FOUND, message: 'Project not found' });
    }

    if (dto.blockId) {
      const block = await tx.propertyBlock.findFirst({
        where: { id: dto.blockId, companyId, deletedAt: null },
      });
      if (!block || block.projectId !== dto.projectId) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Property block not found in this project',
        });
      }
    }

    if (dto.floorId) {
      const floor = await tx.propertyFloor.findFirst({
        where: { id: dto.floorId, companyId, deletedAt: null },
      });
      if (!floor) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Property floor not found',
        });
      }
      if (dto.blockId && floor.blockId !== dto.blockId) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Property floor does not belong to specified block',
        });
      }
    }
  }
}
