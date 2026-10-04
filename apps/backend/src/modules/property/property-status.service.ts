import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { formatPropertyResponse } from './property-builder.util.js';
import type {
  PropertyResponseDto,
  PropertyStatusHistoryResponseDto,
} from './dto/property-response.dto.js';
import {
  CANONICAL_PROPERTY_STATUSES,
  type CanonicalPropertyStatus,
} from './dto/query-property.dto.js';
import type {
  BlockPropertyDto,
  HoldPropertyDto,
  StatusOverrideDto,
} from './dto/status-action.dto.js';

export interface BookingStatusEvent {
  bookingId: string;
  status:
    | 'REQUESTED'
    | 'PENDING_APPROVAL'
    | 'CONFIRMED'
    | 'AGREEMENT_PENDING'
    | 'AGREEMENT_COMPLETED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'TRANSFERRED';
  actorId?: string;
  reason?: string;
  cancellationPropertyStatus?: 'Available' | 'Blocked';
}

interface TransitionParams {
  toStatus: CanonicalPropertyStatus;
  allowedFromStatuses?: CanonicalPropertyStatus[];
  reason: string;
  action: string;
  userId?: string;
  holdExpiresAt?: Date | null;
  blockReason?: string | null;
  metadata?: Record<string, unknown>;
}

const PROPERTY_INCLUDE = {
  block: { select: { id: true, code: true, name: true } },
  floor: { select: { id: true, code: true, name: true, floorNumber: true } },
} as const;

function mapBookingStatusToPropertyStatus(
  status: BookingStatusEvent['status'],
  cancellationStatus: 'Available' | 'Blocked' = 'Available',
): CanonicalPropertyStatus | null {
  switch (status) {
    case 'REQUESTED':
    case 'PENDING_APPROVAL':
      return 'Reserved';
    case 'CONFIRMED':
    case 'AGREEMENT_PENDING':
    case 'AGREEMENT_COMPLETED':
      return 'Booked';
    case 'COMPLETED':
      return 'Sold';
    case 'CANCELLED':
      return cancellationStatus;
    case 'TRANSFERRED':
      return null;
  }
}

@Injectable()
export class PropertyStatusService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
  ) {}

  async applyBookingEvent(
    tx: TenantPrisma,
    companyId: string,
    propertyId: string,
    event: BookingStatusEvent,
  ): Promise<void> {
    const targetStatus = mapBookingStatusToPropertyStatus(
      event.status,
      event.cancellationPropertyStatus,
    );
    if (!targetStatus) return;

    const property = await tx.property.findUnique({
      where: { id: propertyId, companyId, deletedAt: null },
    });
    if (!property) {
      throw new NotFoundException({ code: ERROR_CODES.NOT_FOUND, message: 'Property not found' });
    }
    if (targetStatus === property.status) return;

    await this.performTransition(tx, companyId, property, {
      toStatus: targetStatus,
      reason: event.reason ?? `Booking moved to status ${event.status}`,
      action: 'STATUS_CHANGED',
      userId: event.actorId,
      metadata: { bookingId: event.bookingId, bookingStatus: event.status },
    });
  }

  async holdProperty(
    companyId: string,
    propertyId: string,
    dto: HoldPropertyDto,
    userId?: string,
  ): Promise<PropertyResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const property = await this.findProperty(tx, companyId, propertyId);
      const holdExpiresAt = dto.holdExpiresAt ? new Date(dto.holdExpiresAt) : null;
      return this.performTransition(tx, companyId, property, {
        toStatus: 'Hold',
        allowedFromStatuses: ['Available'],
        reason: dto.reason ?? 'Placed on management hold',
        action: 'PROPERTY_HOLD',
        userId,
        holdExpiresAt,
      });
    });
  }

  async releaseHold(
    companyId: string,
    propertyId: string,
    userId?: string,
  ): Promise<PropertyResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const property = await this.findProperty(tx, companyId, propertyId);
      return this.performTransition(tx, companyId, property, {
        toStatus: 'Available',
        allowedFromStatuses: ['Hold'],
        reason: 'Management hold released',
        action: 'PROPERTY_HOLD_RELEASED',
        userId,
        holdExpiresAt: null,
      });
    });
  }

  async blockProperty(
    companyId: string,
    propertyId: string,
    dto: BlockPropertyDto,
    userId?: string,
  ): Promise<PropertyResponseDto> {
    const reason = dto.reason?.trim();
    if (!reason || reason.length < 3) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Reason is mandatory for blocking a property',
      });
    }

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const property = await this.findProperty(tx, companyId, propertyId);
      return this.performTransition(tx, companyId, property, {
        toStatus: 'Blocked',
        allowedFromStatuses: ['Available', 'Hold'],
        reason,
        action: 'PROPERTY_BLOCKED',
        userId,
        blockReason: reason,
      });
    });
  }

  async unblockProperty(
    companyId: string,
    propertyId: string,
    userId?: string,
  ): Promise<PropertyResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const property = await this.findProperty(tx, companyId, propertyId);
      return this.performTransition(tx, companyId, property, {
        toStatus: 'Available',
        allowedFromStatuses: ['Blocked'],
        reason: 'Property unblocked',
        action: 'PROPERTY_UNBLOCKED',
        userId,
        blockReason: null,
      });
    });
  }

  async overrideStatus(
    companyId: string,
    propertyId: string,
    dto: StatusOverrideDto,
    userId: string,
  ): Promise<PropertyResponseDto> {
    const reason = dto.reason?.trim();
    if (!reason || reason.length < 5) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Reason is mandatory and must be at least 5 characters for status override',
      });
    }

    if (!CANONICAL_PROPERTY_STATUSES.includes(dto.targetStatus)) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `Invalid target status "${dto.targetStatus}"`,
      });
    }

    return this.tenantDb.withCompany(companyId, async (tx) => {
      const property = await this.findProperty(tx, companyId, propertyId);
      return this.performTransition(tx, companyId, property, {
        toStatus: dto.targetStatus,
        reason,
        action: 'STATUS_OVERRIDE',
        userId,
        metadata: { override: true },
      });
    });
  }

  async getStatusHistory(
    companyId: string,
    propertyId: string,
  ): Promise<PropertyStatusHistoryResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const history = await tx.propertyStatusHistory.findMany({
        where: { companyId, propertyId },
        orderBy: { createdAt: 'desc' },
      });
      return history.map((h) => ({
        id: h.id,
        propertyId: h.propertyId,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        reason: h.reason,
        changedById: h.changedById,
        metadata: (h.metadata as Record<string, unknown>) ?? null,
        createdAt: h.createdAt.toISOString(),
      }));
    });
  }

  private async findProperty(tx: TenantPrisma, companyId: string, propertyId: string) {
    const property = await tx.property.findUnique({
      where: { id: propertyId, companyId, deletedAt: null },
      include: PROPERTY_INCLUDE,
    });
    if (!property) {
      throw new NotFoundException({ code: ERROR_CODES.NOT_FOUND, message: 'Property not found' });
    }
    return property;
  }

  private async performTransition(
    tx: TenantPrisma,
    companyId: string,
    property: {
      id: string;
      status: string;
      holdExpiresAt?: Date | null;
      blockReason?: string | null;
    },
    params: TransitionParams,
  ): Promise<PropertyResponseDto> {
    if (
      params.allowedFromStatuses &&
      !params.allowedFromStatuses.includes(property.status as CanonicalPropertyStatus)
    ) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: `Cannot transition property from "${property.status}" to "${params.toStatus}"`,
      });
    }

    const data: Prisma.PropertyUpdateInput = {
      status: params.toStatus,
      ...(params.userId && { updatedById: params.userId }),
    };
    if (params.holdExpiresAt !== undefined) data.holdExpiresAt = params.holdExpiresAt;
    if (params.blockReason !== undefined) data.blockReason = params.blockReason;

    const updated = await tx.property.update({
      where: { id: property.id, companyId },
      data,
      include: PROPERTY_INCLUDE,
    });

    await tx.propertyStatusHistory.create({
      data: {
        companyId,
        propertyId: property.id,
        fromStatus: property.status,
        toStatus: params.toStatus,
        reason: params.reason,
        changedById: params.userId ?? null,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? {},
      },
    });

    await this.auditService.record(tx, {
      action: params.action,
      entity: 'Property',
      entityId: property.id,
      before: { status: property.status },
      after: { status: params.toStatus },
      reason: params.reason,
    });

    return formatPropertyResponse(updated);
  }
}
