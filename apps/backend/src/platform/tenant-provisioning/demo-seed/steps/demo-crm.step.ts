import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DemoSeedContext, DemoSeedStep } from '../demo-seed-step.interface.js';
import {
  DEMO_FOLLOW_UPS,
  DEMO_LEADS,
  type DemoFollowUpDef,
  type DemoLeadDef,
} from './demo-crm.data.js';

@Injectable()
export class DemoCrmStep implements DemoSeedStep {
  private readonly logger = new Logger(DemoCrmStep.name);
  readonly name = 'DemoCrmStep';
  readonly order = 50;

  async execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void> {
    const userMap = await this.getUserMap(ctx.companyId, tx);
    const projectMap = await this.getProjectMap(ctx.companyId, tx);

    let createdCount = 0;
    for (const def of DEMO_LEADS) {
      const created = await this.seedLeadIfMissing(ctx, tx, def, userMap, projectMap);
      if (created) {
        createdCount++;
      }
    }

    let followUpCount = 0;
    for (const fDef of DEMO_FOLLOW_UPS) {
      const created = await this.seedFollowUpIfMissing(ctx, tx, fDef, userMap);
      if (created) followUpCount++;
    }

    this.logger.log(
      `Demo CRM seed completed: ${createdCount} leads, ${followUpCount} follow-ups created for company ${ctx.companyId}`,
    );
  }

  private async getUserMap(
    companyId: string,
    tx: Prisma.TransactionClient,
  ): Promise<Map<string, string>> {
    const users = await tx.user.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { id: true, email: true },
    });

    const userMap = new Map<string, string>();
    for (const u of users) {
      const prefix = u.email.split('@')[0]?.toLowerCase();
      if (prefix) {
        userMap.set(prefix, u.id);
      }
    }
    return userMap;
  }

  private async getProjectMap(
    companyId: string,
    tx: Prisma.TransactionClient,
  ): Promise<Map<string, string>> {
    const projects = await tx.project.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, code: true },
    });

    const projectMap = new Map<string, string>();
    for (const p of projects) {
      projectMap.set(p.code, p.id);
    }
    return projectMap;
  }

  private async seedLeadIfMissing(
    ctx: DemoSeedContext,
    tx: Prisma.TransactionClient,
    def: DemoLeadDef,
    userMap: Map<string, string>,
    projectMap: Map<string, string>,
  ): Promise<boolean> {
    const existing = await tx.lead.findFirst({
      where: {
        companyId: ctx.companyId,
        leadNumber: def.leadNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      return false;
    }

    const assignedToId = def.assigneePrefix ? (userMap.get(def.assigneePrefix) ?? null) : null;
    const preferredProjectId = def.preferredProjectCode
      ? (projectMap.get(def.preferredProjectCode) ?? null)
      : null;

    const lead = await tx.lead.create({
      data: {
        companyId: ctx.companyId,
        leadNumber: def.leadNumber,
        name: def.name,
        phone: def.phone,
        email: def.email,
        source: def.source,
        status: def.status,
        lostReason: def.lostReason,
        interestNotes: def.interestNotes,
        budgetPaisa: def.budgetPaisa,
        preferredPropertyType: def.preferredPropertyType,
        assignedToId,
        preferredProjectId,
        branchId: ctx.branchId,
      },
    });

    await tx.leadStatusHistory.create({
      data: {
        companyId: ctx.companyId,
        leadId: lead.id,
        fromStatus: null,
        toStatus: def.status,
        reason: def.status === 'Lost' ? def.lostReason : 'Initial lead capture',
        changedById: assignedToId,
      },
    });

    return true;
  }

  private async seedFollowUpIfMissing(
    ctx: DemoSeedContext,
    tx: Prisma.TransactionClient,
    def: DemoFollowUpDef,
    userMap: Map<string, string>,
  ): Promise<boolean> {
    const lead = await tx.lead.findFirst({
      where: {
        companyId: ctx.companyId,
        leadNumber: def.leadNumber,
        deletedAt: null,
      },
    });

    if (!lead) {
      return false;
    }

    const dueDate = new Date(`${def.dueDate}T00:00:00.000Z`);
    const existing = await tx.followUp.findFirst({
      where: {
        companyId: ctx.companyId,
        leadId: lead.id,
        type: def.type,
        dueDate,
      },
    });

    if (existing) {
      return false;
    }

    const assignedToId = lead.assignedToId || userMap.get('executive') || lead.createdById;
    if (!assignedToId) {
      return false;
    }

    await tx.followUp.create({
      data: {
        companyId: ctx.companyId,
        leadId: lead.id,
        type: def.type,
        status: def.status,
        priority: def.priority,
        dueDate,
        dueTime: def.dueTime,
        notes: def.notes,
        outcome: def.outcome,
        completedAt: def.status === 'COMPLETED' ? new Date() : null,
        completedById: def.status === 'COMPLETED' ? assignedToId : null,
        assignedToId,
      },
    });

    return true;
  }
}
