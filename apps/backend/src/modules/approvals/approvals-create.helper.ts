import { PERMISSIONS } from '@exzaestate/shared';
import { Prisma } from '@prisma/client';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { ApprovalHandler } from './approval-handler.interface.js';
import type { RequestApprovalInput } from './approval-request.types.js';

export interface CreateApprovalParams {
  tx: TenantPrisma;
  input: RequestApprovalInput;
  approvalNumber: string;
  type: string;
  title: string;
  amountPaisa: bigint | null;
  payload: Prisma.InputJsonValue;
  expiresAt: Date;
}

export async function createSingleUserApproval(
  params: CreateApprovalParams,
  handler?: ApprovalHandler,
) {
  const { tx, input, approvalNumber, type, title, amountPaisa, payload, expiresAt } = params;
  const approval = await tx.approval.create({
    data: {
      companyId: input.companyId,
      approvalNumber,
      type,
      status: 'AUTO_APPROVED',
      requesterId: input.requesterId,
      title,
      description: input.description,
      entityType: input.entityType,
      entityId: input.entityId,
      projectId: input.projectId,
      branchId: input.branchId,
      amountPaisa: amountPaisa ?? null,
      percentage: input.percentage !== undefined ? new Prisma.Decimal(input.percentage) : null,
      payload,
      currentStepOrder: 1,
      totalSteps: 1,
      isAutoApproved: true,
      expiresAt,
      completedAt: new Date(),
      finalDecision: 'AUTO_APPROVED',
      steps: {
        create: [
          {
            companyId: input.companyId,
            stepOrder: 1,
            name: 'Single-User Auto-Approval',
            status: 'AUTO_APPROVED',
            requiredPermission: PERMISSIONS.APPROVAL_VIEW,
            approverId: input.requesterId,
            decidedAt: new Date(),
            decision: 'AUTO_APPROVED',
            comments: 'Auto-approved per single-user company operational mode',
          },
        ],
      },
    },
  });

  if (handler) {
    await handler.execute(tx, approval);
  }

  return approval;
}

export async function createMultiUserApproval(
  params: CreateApprovalParams,
  matchingRules: Array<{ name: string; requiredPermission: string; slaHours: number }>,
) {
  const { tx, input, approvalNumber, type, title, amountPaisa, payload, expiresAt } = params;
  return tx.approval.create({
    data: {
      companyId: input.companyId,
      approvalNumber,
      type,
      status: 'PENDING',
      requesterId: input.requesterId,
      title,
      description: input.description,
      entityType: input.entityType,
      entityId: input.entityId,
      projectId: input.projectId,
      branchId: input.branchId,
      amountPaisa: amountPaisa ?? null,
      percentage: input.percentage !== undefined ? new Prisma.Decimal(input.percentage) : null,
      payload,
      currentStepOrder: 1,
      totalSteps: matchingRules.length,
      isAutoApproved: false,
      expiresAt,
      steps: {
        create: matchingRules.map((r, idx) => ({
          companyId: input.companyId,
          stepOrder: idx + 1,
          name: r.name,
          status: 'PENDING',
          requiredPermission: r.requiredPermission,
          dueAt: new Date(Date.now() + r.slaHours * 60 * 60 * 1000),
        })),
      },
    },
  });
}
