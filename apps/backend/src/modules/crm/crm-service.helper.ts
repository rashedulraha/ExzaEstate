import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Lead, Prisma } from '@prisma/client';
import { ERROR_CODES, type LeadStatus } from '@exzaestate/shared';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { SequenceService } from '../../platform/sequence/sequence.service.js';
import { LEAD_QUERY_INCLUDE } from './crm-query.service.js';
import { enforceLeadScope, type ScopeContext } from './crm-scope.helper.js';
import { validateLeadTransition } from './domain/lead-pipeline-machine.js';
import type { UpdateLeadDto } from './dto/update-lead.dto.js';

export function sanitizeOptionalString(str?: string): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveBudgetPaisa(
  dtoBudget: string | null | undefined,
  currentBudget: bigint | null,
): bigint | null {
  if (dtoBudget === undefined) return currentBudget;
  if (dtoBudget === null) return null;
  return BigInt(dtoBudget);
}

export async function findAndScopeLead(
  tx: TenantPrisma,
  id: string,
  companyId: string,
  context?: ScopeContext,
) {
  const lead = await tx.lead.findFirst({
    where: { id, companyId, deletedAt: null },
    include: LEAD_QUERY_INCLUDE,
  });

  if (!lead) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Lead with ID "${id}" was not found`,
    });
  }

  if (context) {
    enforceLeadScope(lead, context);
  }

  return lead;
}

export async function assertNoDuplicatePhone(
  tx: TenantPrisma,
  companyId: string,
  phone: string,
  allowDuplicate?: boolean,
): Promise<void> {
  if (allowDuplicate) return;
  const existing = await tx.lead.findFirst({
    where: { companyId, phone, deletedAt: null },
    select: { id: true, leadNumber: true, name: true, phone: true },
  });
  if (existing) {
    throw new ConflictException({
      code: ERROR_CODES.CONFLICT,
      message: `A lead with phone "${phone}" already exists (${existing.leadNumber} - ${existing.name})`,
      details: {
        existingLeadId: existing.id,
        leadNumber: existing.leadNumber,
        name: existing.name,
        phone: existing.phone,
      },
    });
  }
}

export async function generateLeadNumber(
  tx: TenantPrisma,
  sequenceService: SequenceService,
): Promise<string> {
  const currentYear = new Date().getFullYear().toString();
  const seqVal = await sequenceService.next(tx, {
    type: 'LEAD',
    fiscalYear: currentYear,
  });
  return sequenceService.format({
    prefix: 'LEAD',
    fiscalYear: currentYear,
    value: seqVal,
    padding: 6,
  });
}

export function validateTransitionOrThrow(
  currentStatus: string,
  toStatus: LeadStatus,
  reason?: string,
): void {
  validateLeadTransition({
    currentStatus: currentStatus as LeadStatus,
    targetStatus: toStatus,
    lostReason: reason,
  });
}

function applyContactFields(data: Prisma.LeadUpdateInput, dto: UpdateLeadDto): void {
  if (dto.name !== undefined) data.name = dto.name.trim();
  if (dto.phone !== undefined) data.phone = dto.phone.trim();
  if (dto.email !== undefined) data.email = sanitizeOptionalString(dto.email);
  if (dto.source !== undefined) data.source = dto.source.trim();
}

function applyPreferenceFields(
  data: Prisma.LeadUpdateInput,
  dto: UpdateLeadDto,
  current: Lead,
): void {
  if (dto.interestNotes !== undefined)
    data.interestNotes = sanitizeOptionalString(dto.interestNotes);
  if (dto.preferredProjectId !== undefined)
    data.preferredProjectId = dto.preferredProjectId || null;
  if (dto.preferredPropertyType !== undefined) {
    data.preferredPropertyType = sanitizeOptionalString(dto.preferredPropertyType);
  }
  if (dto.budgetPaisa !== undefined) {
    data.budgetPaisa = resolveBudgetPaisa(dto.budgetPaisa, current.budgetPaisa);
  }
  if (dto.branchId !== undefined) data.branchId = dto.branchId || null;
}

export function buildLeadUpdateData(
  dto: UpdateLeadDto,
  current: Lead,
  userId?: string,
): Prisma.LeadUpdateInput {
  const data: Prisma.LeadUpdateInput = {
    updatedById: userId || null,
  };
  applyContactFields(data, dto);
  applyPreferenceFields(data, dto, current);
  return data;
}
