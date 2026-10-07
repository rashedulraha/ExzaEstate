import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DemoSeedContext, DemoSeedStep } from '../demo-seed-step.interface.js';
import { DEMO_APPROVAL_TEMPLATES, type DemoApprovalTemplate } from './demo-approval.data.js';

export * from './demo-approval.data.js';

interface SeedContextEntities {
  executiveId: string;
  executive2Id: string;
  accountantId: string;
  mdId: string;
  gmId: string;
  propertyId: string | null;
  quotationId: string | null;
  projectId: string | null;
}

function resolveEntityId(tmpl: DemoApprovalTemplate, entities: SeedContextEntities): string | null {
  if (tmpl.usePropertyId) return entities.propertyId;
  if (tmpl.useQuotationId) return entities.quotationId ?? entities.propertyId;
  return null;
}

function resolveRequesterId(
  role: DemoApprovalTemplate['requesterRole'],
  entities: SeedContextEntities,
): string {
  if (role === 'EXECUTIVE2') return entities.executive2Id || entities.executiveId;
  if (role === 'ACCOUNTANT') return entities.accountantId;
  return entities.executiveId;
}

function resolveApproverId(
  role: 'GM' | 'MD' | undefined,
  entities: SeedContextEntities,
): string | null {
  if (role === 'GM') return entities.gmId || entities.mdId;
  if (role === 'MD') return entities.mdId;
  return null;
}

function buildApprovalCreateInput(
  tmpl: DemoApprovalTemplate,
  ctx: DemoSeedContext,
  entities: SeedContextEntities,
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + tmpl.daysToExpire * 86_400_000);
  const completedAt = tmpl.completedDaysAgo
    ? new Date(now.getTime() - tmpl.completedDaysAgo * 86_400_000)
    : null;

  return {
    companyId: ctx.companyId,
    approvalNumber: tmpl.approvalNumber,
    type: tmpl.type,
    status: tmpl.status,
    requesterId: resolveRequesterId(tmpl.requesterRole, entities),
    title: tmpl.title,
    description: tmpl.description,
    entityType: tmpl.entityType,
    entityId: resolveEntityId(tmpl, entities),
    projectId: tmpl.useProjectId ? entities.projectId : null,
    branchId: ctx.branchId,
    amountPaisa: tmpl.amountPaisa,
    percentage: tmpl.percentage,
    payload: tmpl.payload,
    currentStepOrder: tmpl.currentStepOrder,
    totalSteps: tmpl.totalSteps,
    expiresAt,
    completedAt,
    finalDecision: tmpl.finalDecision ?? null,
    steps: {
      create: tmpl.steps.map((s) => ({
        companyId: ctx.companyId,
        stepOrder: s.stepOrder,
        name: s.name,
        status: s.status,
        requiredPermission: s.requiredPermission,
        approverId: resolveApproverId(s.approverRole, entities),
        dueAt: s.dueInDays ? new Date(now.getTime() + s.dueInDays * 86_400_000) : null,
        decidedAt: s.decidedDaysAgo
          ? new Date(now.getTime() - s.decidedDaysAgo * 86_400_000)
          : null,
        decision: s.decision ?? null,
        comments: s.comments ?? null,
      })),
    },
  };
}

function resolveUserIds(
  exec: { id: string } | null,
  exec2: { id: string } | null,
  acct: { id: string } | null,
  md: { id: string } | null,
  gm: { id: string } | null,
) {
  if (!exec || !acct || !md) return null;
  return {
    executiveId: exec.id,
    executive2Id: exec2 ? exec2.id : exec.id,
    accountantId: acct.id,
    mdId: md.id,
    gmId: gm ? gm.id : md.id,
  };
}

@Injectable()
export class DemoApprovalStep implements DemoSeedStep {
  private readonly logger = new Logger(DemoApprovalStep.name);
  readonly name = 'DemoApprovalStep';
  readonly order = 80;

  private async fetchSeedEntities(
    ctx: DemoSeedContext,
    tx: Prisma.TransactionClient,
  ): Promise<SeedContextEntities | null> {
    const domain =
      ctx.companyCode === 'EXZA' ? 'exzaestate.com' : `${ctx.companyCode.toLowerCase()}.test`;

    const [exec, exec2, acct, md, gm, prop, quot, proj] = await Promise.all([
      tx.user.findUnique({ where: { email: `executive@${domain}`.toLowerCase() } }),
      tx.user.findUnique({ where: { email: `executive2@${domain}`.toLowerCase() } }),
      tx.user.findUnique({ where: { email: `accountant@${domain}`.toLowerCase() } }),
      tx.user.findUnique({ where: { email: `md@${domain}`.toLowerCase() } }),
      tx.user.findUnique({ where: { email: `gm@${domain}`.toLowerCase() } }),
      tx.property.findFirst({ where: { companyId: ctx.companyId, deletedAt: null } }),
      tx.quotation.findFirst({ where: { companyId: ctx.companyId, deletedAt: null } }),
      tx.project.findFirst({ where: { companyId: ctx.companyId, deletedAt: null } }),
    ]);

    const userIds = resolveUserIds(exec, exec2, acct, md, gm);
    if (!userIds) return null;

    return {
      ...userIds,
      propertyId: prop?.id ?? null,
      quotationId: quot?.id ?? null,
      projectId: proj?.id ?? null,
    };
  }

  async execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void> {
    const existing = await tx.approval.findFirst({
      where: { companyId: ctx.companyId, deletedAt: null },
    });

    if (existing) {
      this.logger.debug(`Demo approvals already exist for company ${ctx.companyId}`);
      return;
    }

    const entities = await this.fetchSeedEntities(ctx, tx);
    if (!entities) {
      this.logger.warn(`Skipping demo approvals seed: core staff users not found`);
      return;
    }

    for (const tmpl of DEMO_APPROVAL_TEMPLATES) {
      const data = buildApprovalCreateInput(tmpl, ctx, entities);
      await tx.approval.create({ data });
    }

    this.logger.log(
      `Demo Approval seed completed for company ${ctx.companyId} (${DEMO_APPROVAL_TEMPLATES.length} approvals created)`,
    );
  }
}
