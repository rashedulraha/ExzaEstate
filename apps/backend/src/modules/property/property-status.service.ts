import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import {
  ALLOWED_STATUS_ACTIONS,
  type BookingStatusEventInput,
  type TransitionParams,
  mapBookingStatusToPropertyStatus,
  validateStatusTransition,
} from './domain/property-status-machine.js';
import {
  PROPERTY_INCLUDE,
  buildTransitionUpdateData,
  formatPropertyResponse,
} from './property-builder.util.js';
import { PROPERTY_EVENTS } from './property.events.js';
import type {
  PropertyResponseDto,
  PropertyStatusHistoryResponseDto,
} from './dto/property-response.dto.js';
import { CANONICAL_PROPERTY_STATUSES } from './dto/query-property.dto.js';
import type {
  BlockPropertyDto,
  HoldPropertyDto,
  StatusOverrideDto,
} from './dto/status-action.dto.js';

export type BookingStatusEvent = BookingStatusEventInput;

@Injectable()
export class PropertyStatusService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    @Optional() private readonly outboxService?: OutboxService,
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

    const property = await tx.property.findFirst({
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
        toStatus: ALLOWED_STATUS_ACTIONS.HOLD.to,
        allowedFromStatuses: ALLOWED_STATUS_ACTIONS.HOLD.from,
        reason: dto.reason ?? 'Placed on management hold',
        action: ALLOWED_STATUS_ACTIONS.HOLD.action,
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
        toStatus: ALLOWED_STATUS_ACTIONS.RELEASE_HOLD.to,
        allowedFromStatuses: ALLOWED_STATUS_ACTIONS.RELEASE_HOLD.from,
        reason: 'Management hold released',
        action: ALLOWED_STATUS_ACTIONS.RELEASE_HOLD.action,
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
        toStatus: ALLOWED_STATUS_ACTIONS.BLOCK.to,
        allowedFromStatuses: ALLOWED_STATUS_ACTIONS.BLOCK.from,
        reason,
        action: ALLOWED_STATUS_ACTIONS.BLOCK.action,
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
        toStatus: ALLOWED_STATUS_ACTIONS.UNBLOCK.to,
        allowedFromStatuses: ALLOWED_STATUS_ACTIONS.UNBLOCK.from,
        reason: 'Property unblocked',
        action: ALLOWED_STATUS_ACTIONS.UNBLOCK.action,
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
    const property = await tx.property.findFirst({
      where: { id: propertyId, companyId, deletedAt: null },
      include: PROPERTY_INCLUDE,
    });
    if (!property) {
      throw new NotFoundException({ code: ERROR_CODES.NOT_FOUND, message: 'Property not found' });
    }
    return property;
  }

  private async recordTransitionAudit(
    tx: TenantPrisma,
    companyId: string,
    propertyId: string,
    fromStatus: string,
    params: TransitionParams,
  ): Promise<void> {
    await this.auditService.record(tx, {
      action: params.action,
      entity: 'Property',
      entityId: propertyId,
      before: { status: fromStatus },
      after: { status: params.toStatus },
      reason: params.reason,
    });

    if (this.outboxService) {
      await this.outboxService.emit(tx, PROPERTY_EVENTS.STATUS_CHANGED, {
        propertyId,
        companyId,
        fromStatus,
        toStatus: params.toStatus,
        action: params.action,
        reason: params.reason,
        actorId: params.userId ?? null,
        metadata: params.metadata ?? {},
        timestamp: new Date().toISOString(),
      });
    }
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
    const transitionCheck = validateStatusTransition(
      property.status,
      params.toStatus,
      params.allowedFromStatuses,
    );
    if (!transitionCheck.valid) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message:
          transitionCheck.error ?? `Cannot transition property status to "${params.toStatus}"`,
      });
    }

    const data = buildTransitionUpdateData(params);
    const updated = await tx.property.update({
      where: { id: property.id },
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

    await this.recordTransitionAudit(tx, companyId, property.id, property.status, params);

    return formatPropertyResponse(updated);
  }
}
