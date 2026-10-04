import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@exzaestate/shared';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { FollowUpWithRelations } from './follow-up.mapper.js';
import { enforceFollowUpScope, type FollowUpScopeContext } from './follow-up-scope.helper.js';
import type { CreateFollowUpDto } from './dto/create-follow-up.dto.js';
import type { UpdateFollowUpDto } from './dto/update-follow-up.dto.js';
import type { CompleteFollowUpDto } from './dto/complete-follow-up.dto.js';

export const FOLLOW_UP_INCLUDE = {
  lead: {
    select: {
      id: true,
      name: true,
      branchId: true,
    },
  },
} as const;

export function parseBusinessDate(dateStr: string): Date {
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `Invalid date format "${dateStr}". Expected YYYY-MM-DD`,
    });
  }
  return new Date(`${trimmed}T00:00:00.000Z`);
}

export async function assertLeadBelongsToCompany(
  tx: TenantPrisma,
  companyId: string,
  leadId: string,
): Promise<void> {
  const lead = await tx.lead.findFirst({
    where: {
      id: leadId,
      companyId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!lead) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Lead with ID "${leadId}" was not found`,
    });
  }
}

export async function findAndScopeFollowUp(
  tx: TenantPrisma,
  companyId: string,
  id: string,
  context?: FollowUpScopeContext,
): Promise<FollowUpWithRelations> {
  const followUp = await tx.followUp.findFirst({
    where: {
      id,
      companyId,
      deletedAt: null,
    },
    include: FOLLOW_UP_INCLUDE,
  });

  if (!followUp) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Follow-up with ID "${id}" was not found`,
    });
  }

  if (context) {
    enforceFollowUpScope(followUp, context);
  }

  return followUp;
}

export function buildFollowUpUpdateData(
  dto: UpdateFollowUpDto,
  userId?: string,
): Prisma.FollowUpUpdateInput {
  const data: Prisma.FollowUpUpdateInput = {};

  if (dto.type !== undefined) data.type = dto.type;
  if (dto.dueDate !== undefined) data.dueDate = parseBusinessDate(dto.dueDate);
  if (dto.dueTime !== undefined) data.dueTime = dto.dueTime;
  if (dto.priority !== undefined) data.priority = dto.priority;
  if (dto.notes !== undefined) data.notes = dto.notes;
  if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;

  if (userId) {
    data.updatedById = userId;
  }

  return data;
}

export function buildFollowUpCreateData(
  companyId: string,
  dto: CreateFollowUpDto,
  assignedToId: string,
  userId?: string,
): Prisma.FollowUpUncheckedCreateInput {
  return {
    companyId,
    leadId: dto.leadId ?? null,
    customerId: dto.customerId ?? null,
    type: dto.type,
    status: 'PENDING',
    priority: dto.priority ?? 'MEDIUM',
    dueDate: parseBusinessDate(dto.dueDate),
    dueTime: dto.dueTime ?? null,
    notes: dto.notes ?? null,
    assignedToId,
    createdById: userId ?? null,
  };
}

export async function scheduleNextFollowUp(
  tx: TenantPrisma,
  companyId: string,
  existing: FollowUpWithRelations,
  dto: CompleteFollowUpDto,
  userId?: string,
): Promise<string | null> {
  if (!dto.nextFollowUpDate) {
    return null;
  }
  const nextCreated = await tx.followUp.create({
    data: {
      companyId,
      leadId: existing.leadId,
      customerId: existing.customerId,
      type: dto.nextFollowUpType ?? existing.type,
      status: 'PENDING',
      priority: existing.priority,
      dueDate: parseBusinessDate(dto.nextFollowUpDate),
      notes: dto.nextFollowUpNotes ?? null,
      assignedToId: existing.assignedToId,
      createdById: userId ?? null,
    },
  });
  return nextCreated.id;
}

export function buildFollowUpCompleteData(
  dto: CompleteFollowUpDto,
  userId?: string,
): Prisma.FollowUpUpdateInput {
  return {
    status: 'COMPLETED',
    outcome: dto.outcome.trim(),
    completedAt: new Date(),
    completedById: userId ?? null,
    nextFollowUpDate: dto.nextFollowUpDate ? parseBusinessDate(dto.nextFollowUpDate) : null,
    updatedById: userId ?? null,
  };
}
