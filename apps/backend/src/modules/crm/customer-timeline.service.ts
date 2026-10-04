import { Injectable } from '@nestjs/common';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { findAndScopeCustomer } from './customer-service.helper.js';
import type { CustomerScopeContext } from './customer-scope.helper.js';
import type { CustomerTimelineItemDto, CustomerTimelineResponseDto } from './dto/index.js';

interface RawTimelineItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CustomerTimelineService {
  constructor(private readonly tenantDb: TenantDb) {}

  async getCustomerTimeline(
    companyId: string,
    customerId: string,
    context?: CustomerScopeContext,
  ): Promise<CustomerTimelineResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const customer = await findAndScopeCustomer(tx, companyId, customerId, context);
      const rawItems: RawTimelineItem[] = [];

      await this.collectLeadEvents(tx, customer, rawItems);
      this.collectCustomerCreationEvent(customer, rawItems);
      await this.collectFollowUpEvents(tx, companyId, customer, rawItems);
      this.collectKycEvents(customer, rawItems);
      await this.collectDocumentEvents(tx, companyId, customer.id, rawItems);

      const itemsWithActors = await this.enrichActorNames(tx, rawItems);
      itemsWithActors.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      return {
        customerId: customer.id,
        customerNumber: customer.customerNumber,
        totalEvents: itemsWithActors.length,
        items: itemsWithActors,
      };
    });
  }

  private async collectLeadEvents(
    tx: TenantPrisma,
    customer: {
      id: string;
      customerNumber: string;
      leadId: string | null;
      createdAt: Date;
      createdById: string | null;
    },
    items: RawTimelineItem[],
  ): Promise<void> {
    if (!customer.leadId) return;

    const lead = await tx.lead.findUnique({
      where: { id: customer.leadId },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!lead) return;

    items.push({
      id: `lead-captured-${lead.id}`,
      type: 'LEAD_CAPTURED',
      title: 'Lead Captured',
      description: `Lead ${lead.leadNumber} created from source "${lead.source}"`,
      timestamp: lead.createdAt.toISOString(),
      actorId: lead.createdById,
      metadata: {
        leadId: lead.id,
        leadNumber: lead.leadNumber,
        source: lead.source,
        phone: lead.phone,
      },
    });

    for (const history of lead.statusHistory) {
      items.push({
        id: `lead-status-${history.id}`,
        type: 'LEAD_STATUS_CHANGED',
        title: `Lead Status: ${history.toStatus}`,
        description: history.fromStatus
          ? `Status transitioned from "${history.fromStatus}" to "${history.toStatus}"${history.reason ? ` (${history.reason})` : ''}`
          : `Initial status set to "${history.toStatus}"`,
        timestamp: history.createdAt.toISOString(),
        actorId: history.changedById,
        metadata: {
          fromStatus: history.fromStatus,
          toStatus: history.toStatus,
          reason: history.reason,
        },
      });
    }

    items.push({
      id: `lead-converted-${customer.id}`,
      type: 'LEAD_CONVERTED',
      title: 'Converted to Customer',
      description: `Lead ${lead.leadNumber} converted to customer ${customer.customerNumber}`,
      timestamp: customer.createdAt.toISOString(),
      actorId: customer.createdById,
      metadata: { customerNumber: customer.customerNumber, leadId: customer.leadId },
    });
  }

  private collectCustomerCreationEvent(
    customer: {
      id: string;
      customerNumber: string;
      name: string;
      leadId: string | null;
      createdAt: Date;
      createdById: string | null;
    },
    items: RawTimelineItem[],
  ): void {
    if (customer.leadId) return;

    items.push({
      id: `customer-created-${customer.id}`,
      type: 'CUSTOMER_CREATED',
      title: 'Customer Profile Created',
      description: `Customer ${customer.customerNumber} (${customer.name}) created directly`,
      timestamp: customer.createdAt.toISOString(),
      actorId: customer.createdById,
      metadata: { customerNumber: customer.customerNumber },
    });
  }

  private async collectFollowUpEvents(
    tx: TenantPrisma,
    companyId: string,
    customer: { id: string; leadId: string | null },
    items: RawTimelineItem[],
  ): Promise<void> {
    const followUps = await tx.followUp.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { customerId: customer.id },
          ...(customer.leadId ? [{ leadId: customer.leadId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const f of followUps) {
      items.push({
        id: `followup-sched-${f.id}`,
        type: 'FOLLOW_UP_SCHEDULED',
        title: `Follow-up Scheduled (${f.type})`,
        description: `Follow-up (${f.type}) scheduled for ${f.dueDate.toISOString().slice(0, 10)}${f.dueTime ? ` at ${f.dueTime}` : ''}. Priority: ${f.priority}${f.notes ? ` — ${f.notes}` : ''}`,
        timestamp: f.createdAt.toISOString(),
        actorId: f.createdById,
        metadata: { followUpId: f.id, type: f.type, priority: f.priority, status: f.status },
      });

      if (f.status === 'COMPLETED' && f.completedAt) {
        items.push({
          id: `followup-comp-${f.id}`,
          type: 'FOLLOW_UP_COMPLETED',
          title: `Follow-up Completed (${f.type})`,
          description: `Follow-up (${f.type}) marked completed.${f.outcome ? ` Outcome: ${f.outcome}` : ''}`,
          timestamp: f.completedAt.toISOString(),
          actorId: f.completedById,
          metadata: { followUpId: f.id, outcome: f.outcome, nextFollowUpDate: f.nextFollowUpDate },
        });
      }
    }
  }

  private collectKycEvents(
    customer: {
      id: string;
      isKycCompleted: boolean;
      kycCompletedAt: Date | null;
      kycCompletedById: string | null;
      kycNotes: string | null;
    },
    items: RawTimelineItem[],
  ): void {
    if (!customer.isKycCompleted || !customer.kycCompletedAt) return;

    items.push({
      id: `customer-kyc-${customer.id}`,
      type: 'KYC_VERIFIED',
      title: 'KYC Verification Completed',
      description: `Customer KYC verified and approved.${customer.kycNotes ? ` Notes: ${customer.kycNotes}` : ''}`,
      timestamp: customer.kycCompletedAt.toISOString(),
      actorId: customer.kycCompletedById,
      metadata: { kycCompletedAt: customer.kycCompletedAt.toISOString(), notes: customer.kycNotes },
    });
  }

  private async collectDocumentEvents(
    tx: TenantPrisma,
    companyId: string,
    customerId: string,
    items: RawTimelineItem[],
  ): Promise<void> {
    const documents = await tx.document.findMany({
      where: {
        companyId,
        entityType: 'CUSTOMER',
        entityId: customerId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const doc of documents) {
      items.push({
        id: `doc-${doc.id}`,
        type: 'DOCUMENT_ATTACHED',
        title: `Document Attached: ${doc.title}`,
        description: `Document of category "${doc.category || 'General'}" attached`,
        timestamp: doc.createdAt.toISOString(),
        actorId: doc.createdById,
        metadata: { documentId: doc.id, title: doc.title, category: doc.category },
      });
    }
  }

  private async enrichActorNames(
    tx: TenantPrisma,
    items: RawTimelineItem[],
  ): Promise<CustomerTimelineItemDto[]> {
    const actorIds = new Set<string>();
    for (const item of items) {
      if (item.actorId) actorIds.add(item.actorId);
    }

    const users =
      actorIds.size > 0
        ? await tx.user.findMany({
            where: { id: { in: Array.from(actorIds) } },
            select: { id: true, fullName: true },
          })
        : [];

    const userMap = new Map(users.map((u) => [u.id, u.fullName]));

    return items.map((item) => ({
      ...item,
      actorName: item.actorId ? (userMap.get(item.actorId) ?? null) : null,
    }));
  }
}
