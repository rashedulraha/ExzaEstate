import type { FollowUp, Lead } from '@prisma/client';
import { isOverdueBusinessDate } from '@exzaestate/shared';
import type { FollowUpResponseDto } from './dto/follow-up-response.dto.js';

export type FollowUpWithRelations = FollowUp & {
  lead?: Pick<Lead, 'id' | 'name'> | null;
};

function formatDateOnly(date: Date | string | null | undefined): string | null {
  if (!date) {
    return null;
  }
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }
  return String(date).slice(0, 10);
}

export function formatFollowUpResponse(
  followUp: FollowUpWithRelations,
  companyTimezone: string = 'Asia/Dhaka',
): FollowUpResponseDto {
  const isOverdue =
    followUp.status === 'PENDING' && isOverdueBusinessDate(followUp.dueDate, companyTimezone);

  const dueDateFormatted = formatDateOnly(followUp.dueDate) ?? '';
  const nextFollowUpDateFormatted = formatDateOnly(followUp.nextFollowUpDate);

  return {
    id: followUp.id,
    companyId: followUp.companyId,
    leadId: followUp.leadId,
    leadName: followUp.lead?.name ?? null,
    customerId: followUp.customerId,
    type: followUp.type,
    status: followUp.status,
    priority: followUp.priority,
    dueDate: dueDateFormatted,
    dueTime: followUp.dueTime,
    notes: followUp.notes,
    outcome: followUp.outcome,
    isOverdue,
    completedAt: followUp.completedAt ? followUp.completedAt.toISOString() : null,
    completedById: followUp.completedById,
    nextFollowUpDate: nextFollowUpDateFormatted,
    assignedToId: followUp.assignedToId,
    createdById: followUp.createdById,
    createdAt: followUp.createdAt.toISOString(),
    updatedAt: followUp.updatedAt.toISOString(),
  };
}
