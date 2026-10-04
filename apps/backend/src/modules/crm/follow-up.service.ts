import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import { CRM_EVENTS } from './crm.events.js';
import { formatFollowUpResponse } from './follow-up.mapper.js';
import type { FollowUpScopeContext } from './follow-up-scope.helper.js';
import {
  assertLeadBelongsToCompany,
  buildFollowUpCompleteData,
  buildFollowUpCreateData,
  buildFollowUpUpdateData,
  findAndScopeFollowUp,
  FOLLOW_UP_INCLUDE,
  scheduleNextFollowUp,
} from './follow-up-service.helper.js';
import type {
  CompleteFollowUpDto,
  CreateFollowUpDto,
  FollowUpResponseDto,
  UpdateFollowUpDto,
} from './dto/index.js';

@Injectable()
export class FollowUpService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  async createFollowUp(
    companyId: string,
    dto: CreateFollowUpDto,
    userId?: string,
    companyTimezone: string = 'Asia/Dhaka',
  ): Promise<FollowUpResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      if (dto.leadId) {
        await assertLeadBelongsToCompany(tx, companyId, dto.leadId);
      }

      const assignedToId = dto.assignedToId || userId;
      if (!assignedToId) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'An assigned user (assignedToId) is required for follow-up creation',
        });
      }

      const created = await tx.followUp.create({
        data: buildFollowUpCreateData(companyId, dto, assignedToId, userId),
        include: FOLLOW_UP_INCLUDE,
      });

      await this.auditService.record(tx, {
        module: 'crm',
        entity: 'FollowUp',
        entityId: created.id,
        action: 'CRM_FOLLOW_UP_CREATE',
        newValue: {
          type: created.type,
          dueDate: dto.dueDate,
          priority: created.priority,
          assignedToId: created.assignedToId,
          leadId: created.leadId,
        },
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, CRM_EVENTS.FOLLOW_UP_CREATED, {
          followUpId: created.id,
          companyId,
          leadId: created.leadId,
          type: created.type,
          dueDate: dto.dueDate,
          priority: created.priority,
          assignedToId: created.assignedToId,
          actorId: userId,
        });
      }

      return formatFollowUpResponse(created, companyTimezone);
    });
  }

  async updateFollowUp(
    companyId: string,
    id: string,
    dto: UpdateFollowUpDto,
    context?: FollowUpScopeContext,
    companyTimezone: string = 'Asia/Dhaka',
  ): Promise<FollowUpResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeFollowUp(tx, companyId, id, context);

      const updateData = buildFollowUpUpdateData(dto, context?.userId);

      const updated = await tx.followUp.update({
        where: { id },
        data: updateData,
        include: FOLLOW_UP_INCLUDE,
      });

      await this.auditService.record(tx, {
        module: 'crm',
        entity: 'FollowUp',
        entityId: updated.id,
        action: 'CRM_FOLLOW_UP_UPDATE',
        newValue: updateData as Record<string, unknown>,
      });

      return formatFollowUpResponse(updated, companyTimezone);
    });
  }

  async completeFollowUp(
    companyId: string,
    id: string,
    dto: CompleteFollowUpDto,
    context?: FollowUpScopeContext,
    companyTimezone: string = 'Asia/Dhaka',
  ): Promise<FollowUpResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await findAndScopeFollowUp(tx, companyId, id, context);

      if (existing.status !== 'PENDING') {
        throw new BadRequestException({
          code: ERROR_CODES.INVALID_STATE_TRANSITION,
          message: `Cannot complete follow-up with status "${existing.status}". Only PENDING follow-ups can be completed.`,
        });
      }

      const nextFollowUpId = await scheduleNextFollowUp(
        tx,
        companyId,
        existing,
        dto,
        context?.userId,
      );

      const completed = await tx.followUp.update({
        where: { id },
        data: buildFollowUpCompleteData(dto, context?.userId),
        include: FOLLOW_UP_INCLUDE,
      });

      await this.auditService.record(tx, {
        module: 'crm',
        entity: 'FollowUp',
        entityId: completed.id,
        action: 'CRM_FOLLOW_UP_COMPLETE',
        newValue: {
          outcome: completed.outcome,
          nextFollowUpId,
        },
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, CRM_EVENTS.FOLLOW_UP_COMPLETED, {
          followUpId: completed.id,
          companyId,
          leadId: completed.leadId,
          type: completed.type,
          outcome: completed.outcome,
          completedById: context?.userId ?? '',
          nextFollowUpId,
        });
      }

      return formatFollowUpResponse(completed, companyTimezone);
    });
  }

  async deleteFollowUp(
    companyId: string,
    id: string,
    context?: FollowUpScopeContext,
  ): Promise<{ success: boolean; id: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeFollowUp(tx, companyId, id, context);

      await tx.followUp.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: context?.userId ?? null,
        },
      });

      await this.auditService.record(tx, {
        module: 'crm',
        entity: 'FollowUp',
        entityId: id,
        action: 'CRM_FOLLOW_UP_DELETE',
        newValue: { deletedAt: new Date().toISOString() },
      });

      return { success: true, id };
    });
  }
}
