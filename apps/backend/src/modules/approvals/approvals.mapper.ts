import type { Approval, ApprovalRule, ApprovalStep } from '@prisma/client';
import type {
  ApprovalResponseDto,
  ApprovalRuleResponseDto,
  ApprovalStepResponseDto,
} from './dto/index.js';

export function mapApprovalStepToDto(step: ApprovalStep): ApprovalStepResponseDto {
  return {
    id: step.id,
    approvalId: step.approvalId,
    stepOrder: step.stepOrder,
    name: step.name,
    status: step.status,
    requiredPermission: step.requiredPermission,
    approverId: step.approverId,
    decidedAt: step.decidedAt ? step.decidedAt.toISOString() : null,
    decision: step.decision,
    comments: step.comments,
    dueAt: step.dueAt ? step.dueAt.toISOString() : null,
    createdAt: step.createdAt.toISOString(),
    updatedAt: step.updatedAt.toISOString(),
  };
}

export function mapApprovalToDto(
  approval: Approval & { steps?: ApprovalStep[] },
): ApprovalResponseDto {
  return {
    id: approval.id,
    approvalNumber: approval.approvalNumber,
    type: approval.type,
    status: approval.status,
    requesterId: approval.requesterId,
    title: approval.title,
    description: approval.description,
    entityType: approval.entityType,
    entityId: approval.entityId,
    projectId: approval.projectId,
    branchId: approval.branchId,
    amountPaisa: approval.amountPaisa !== null ? approval.amountPaisa.toString() : null,
    percentage: approval.percentage !== null ? Number(approval.percentage) : null,
    payload: approval.payload as Record<string, unknown>,
    currentStepOrder: approval.currentStepOrder,
    totalSteps: approval.totalSteps,
    isAutoApproved: approval.isAutoApproved,
    expiresAt: approval.expiresAt.toISOString(),
    completedAt: approval.completedAt ? approval.completedAt.toISOString() : null,
    finalDecision: approval.finalDecision,
    rejectionReason: approval.rejectionReason,
    overrideFirstUserId: approval.overrideFirstUserId,
    overrideFirstAt: approval.overrideFirstAt ? approval.overrideFirstAt.toISOString() : null,
    overrideFirstReason: approval.overrideFirstReason,
    overrideSecondUserId: approval.overrideSecondUserId,
    overrideSecondAt: approval.overrideSecondAt ? approval.overrideSecondAt.toISOString() : null,
    overrideSecondReason: approval.overrideSecondReason,
    createdAt: approval.createdAt.toISOString(),
    updatedAt: approval.updatedAt.toISOString(),
    steps: Array.isArray(approval.steps) ? approval.steps.map(mapApprovalStepToDto) : [],
  };
}

export function mapApprovalRuleToDto(rule: ApprovalRule): ApprovalRuleResponseDto {
  return {
    id: rule.id,
    type: rule.type,
    name: rule.name,
    description: rule.description,
    minAmountPaisa: rule.minAmountPaisa.toString(),
    maxAmountPaisa: rule.maxAmountPaisa !== null ? rule.maxAmountPaisa.toString() : null,
    minPercentage: rule.minPercentage !== null ? Number(rule.minPercentage) : null,
    maxPercentage: rule.maxPercentage !== null ? Number(rule.maxPercentage) : null,
    projectId: rule.projectId,
    branchId: rule.branchId,
    requiredPermission: rule.requiredPermission,
    stepOrder: rule.stepOrder,
    slaHours: rule.slaHours,
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}
