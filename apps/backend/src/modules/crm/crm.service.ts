import { Injectable, Optional } from '@nestjs/common';
import { LEAD_STATUSES, type LeadStatus } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import { SequenceService } from '../../platform/sequence/sequence.service.js';
import { CRM_EVENTS } from './crm.events.js';
import { formatLeadResponse } from './crm.mapper.js';
import { LEAD_QUERY_INCLUDE } from './crm-query.service.js';
import { type ScopeContext } from './crm-scope.helper.js';
import {
  assertNoDuplicatePhone,
  buildLeadUpdateData,
  findAndScopeLead,
  generateLeadNumber,
  sanitizeOptionalString,
  validateTransitionOrThrow,
} from './crm-service.helper.js';
import type { AssignLeadDto } from './dto/assign-lead.dto.js';
import type { ChangeLeadStatusDto } from './dto/change-lead-status.dto.js';
import type { CreateLeadDto } from './dto/create-lead.dto.js';
import type { LeadResponseDto } from './dto/lead-response.dto.js';
import type { UpdateLeadDto } from './dto/update-lead.dto.js';

@Injectable()
export class CrmService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly sequenceService: SequenceService,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  async createLead(
    companyId: string,
    dto: CreateLeadDto,
    userId?: string,
  ): Promise<LeadResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const normalizedPhone = dto.phone.trim();
      await assertNoDuplicatePhone(tx, companyId, normalizedPhone, dto.allowDuplicate);

      const leadNumber = await generateLeadNumber(tx, this.sequenceService);
      const budgetPaisa = dto.budgetPaisa ? BigInt(dto.budgetPaisa) : null;
      const assignedToId = dto.assignedToId || userId || null;

      const lead = await tx.lead.create({
        data: {
          companyId,
          leadNumber,
          name: dto.name.trim(),
          phone: normalizedPhone,
          email: sanitizeOptionalString(dto.email),
          source: dto.source.trim(),
          status: LEAD_STATUSES.NEW,
          interestNotes: sanitizeOptionalString(dto.interestNotes),
          preferredProjectId: dto.preferredProjectId || null,
          preferredPropertyType: sanitizeOptionalString(dto.preferredPropertyType),
          budgetPaisa,
          assignedToId,
          branchId: dto.branchId || null,
          createdById: userId || null,
          updatedById: userId || null,
        },
        include: LEAD_QUERY_INCLUDE,
      });

      await tx.leadStatusHistory.create({
        data: {
          companyId,
          leadId: lead.id,
          fromStatus: null,
          toStatus: LEAD_STATUSES.NEW,
          reason: 'Initial lead capture',
          changedById: userId || null,
        },
      });

      await this.auditService.record(tx, {
        action: 'LEAD_CREATED',
        module: 'crm',
        recordType: 'Lead',
        recordId: lead.id,
        after: {
          leadNumber: lead.leadNumber,
          name: lead.name,
          phone: lead.phone,
          source: lead.source,
          status: lead.status,
          assignedToId: lead.assignedToId,
        },
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, CRM_EVENTS.LEAD_CREATED, {
          leadId: lead.id,
          leadNumber: lead.leadNumber,
          name: lead.name,
          phone: lead.phone,
          source: lead.source,
          assignedToId: lead.assignedToId,
          branchId: lead.branchId,
        });
      }

      return formatLeadResponse(lead);
    });
  }

  async updateLead(
    companyId: string,
    id: string,
    dto: UpdateLeadDto,
    userId?: string,
    context?: ScopeContext,
  ): Promise<LeadResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const lead = await findAndScopeLead(tx, id, companyId, context);
      const updateData = buildLeadUpdateData(dto, lead, userId);

      const updated = await tx.lead.update({
        where: { id },
        data: updateData,
        include: LEAD_QUERY_INCLUDE,
      });

      await this.auditService.record(tx, {
        action: 'LEAD_UPDATED',
        module: 'crm',
        recordType: 'Lead',
        recordId: id,
        before: { name: lead.name, phone: lead.phone, budgetPaisa: lead.budgetPaisa?.toString() },
        after: {
          name: updated.name,
          phone: updated.phone,
          budgetPaisa: updated.budgetPaisa?.toString(),
        },
      });

      return formatLeadResponse(updated);
    });
  }

  async changeLeadStatus(
    companyId: string,
    id: string,
    dto: ChangeLeadStatusDto,
    userId?: string,
    context?: ScopeContext,
  ): Promise<LeadResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const lead = await findAndScopeLead(tx, id, companyId, context);
      const targetStatus = (dto.toStatus || dto.status || '') as LeadStatus;
      const reason = dto.reason || dto.lostReason;

      validateTransitionOrThrow(lead.status, targetStatus, reason);

      const isLost = targetStatus === LEAD_STATUSES.LOST;
      const lostReason = isLost ? sanitizeOptionalString(reason) : null;

      const updated = await tx.lead.update({
        where: { id },
        data: {
          status: targetStatus,
          lostReason,
          updatedById: userId || null,
        },
        include: LEAD_QUERY_INCLUDE,
      });

      await tx.leadStatusHistory.create({
        data: {
          companyId,
          leadId: id,
          fromStatus: lead.status,
          toStatus: targetStatus,
          reason: sanitizeOptionalString(reason),
          changedById: userId || null,
        },
      });

      await this.auditService.record(tx, {
        action: 'LEAD_STATUS_CHANGED',
        module: 'crm',
        recordType: 'Lead',
        recordId: id,
        before: { status: lead.status },
        after: { status: targetStatus, reason },
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, CRM_EVENTS.LEAD_STATUS_CHANGED, {
          leadId: id,
          fromStatus: lead.status,
          toStatus: targetStatus,
          reason,
          assignedToId: updated.assignedToId,
        });
      }

      return formatLeadResponse(updated);
    });
  }

  async assignLead(
    companyId: string,
    id: string,
    dto: AssignLeadDto,
    userId?: string,
    context?: ScopeContext,
  ): Promise<LeadResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const lead = await findAndScopeLead(tx, id, companyId, context);

      const updated = await tx.lead.update({
        where: { id },
        data: {
          assignedToId: dto.assignedToId,
          updatedById: userId || null,
        },
        include: LEAD_QUERY_INCLUDE,
      });

      await this.auditService.record(tx, {
        action: 'LEAD_ASSIGNED',
        module: 'crm',
        recordType: 'Lead',
        recordId: id,
        before: { assignedToId: lead.assignedToId },
        after: { assignedToId: dto.assignedToId },
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, CRM_EVENTS.LEAD_ASSIGNED, {
          leadId: id,
          previousAssignedToId: lead.assignedToId,
          newAssignedToId: dto.assignedToId,
        });
      }

      return formatLeadResponse(updated);
    });
  }

  async deleteLead(
    companyId: string,
    id: string,
    userId?: string,
    context?: ScopeContext,
  ): Promise<{ success: true }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeLead(tx, id, companyId, context);

      await tx.lead.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: userId || null,
        },
      });

      await this.auditService.record(tx, {
        action: 'LEAD_DELETED',
        module: 'crm',
        recordType: 'Lead',
        recordId: id,
      });

      return { success: true };
    });
  }
}
