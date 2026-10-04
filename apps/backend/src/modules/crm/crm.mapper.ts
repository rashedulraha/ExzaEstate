import type { Lead, LeadStatusHistory } from '@prisma/client';
import type { LeadResponseDto } from './dto/lead-response.dto.js';

export type LeadWithHistory = Lead & {
  statusHistory?: LeadStatusHistory[];
};

export function formatLeadResponse(lead: LeadWithHistory): LeadResponseDto {
  return {
    id: lead.id,
    companyId: lead.companyId,
    leadNumber: lead.leadNumber,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    status: lead.status,
    lostReason: lead.lostReason,
    interestNotes: lead.interestNotes,
    preferredProjectId: lead.preferredProjectId,
    preferredPropertyType: lead.preferredPropertyType,
    budgetPaisa: lead.budgetPaisa !== null ? lead.budgetPaisa.toString() : null,
    assignedToId: lead.assignedToId,
    branchId: lead.branchId,
    createdById: lead.createdById,
    updatedById: lead.updatedById,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    statusHistory: lead.statusHistory?.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      changedById: h.changedById,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}
