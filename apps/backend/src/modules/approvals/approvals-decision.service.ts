import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { canPermissionApprove } from './domain/discount-matrix.js';
import { mapApprovalToDto } from './approvals.mapper.js';
import type { ApprovalResponseDto } from './dto/index.js';
import { ApprovalsService } from './approvals.service.js';

@Injectable()
export class ApprovalsDecisionService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly approvalsService: ApprovalsService,
    private readonly auditService: AuditService,
  ) {}

  private validateApprovalStep(
    approval: {
      status: string;
      expiresAt: Date;
      requesterId: string;
      currentStepOrder: number;
      steps: Array<{
        id: string;
        stepOrder: number;
        status: string;
        requiredPermission: string;
      }>;
    } | null,
    id: string,
    userId: string,
    userPermissions: readonly string[],
  ) {
    if (!approval) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: `Approval request "${id}" not found`,
      });
    }

    if (approval.status !== 'PENDING') {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot approve request in "${approval.status}" status. Only PENDING requests may be approved.`,
      });
    }

    if (new Date(approval.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Approval request has expired and cannot be approved',
      });
    }

    if (approval.requesterId === userId) {
      throw new ForbiddenException({
        code: ERROR_CODES.SELF_APPROVAL_FORBIDDEN,
        message: 'Requester cannot approve their own request (maker-checker rule)',
      });
    }

    const currentStep = approval.steps.find(
      (s) => s.stepOrder === approval.currentStepOrder && s.status === 'PENDING',
    );
    if (!currentStep) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'No pending step found for the current approval stage',
      });
    }

    if (!canPermissionApprove(userPermissions, currentStep.requiredPermission)) {
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN,
        message: `User lacks required authority ("${currentStep.requiredPermission}") to approve this step`,
      });
    }

    return currentStep;
  }

  private async advanceApprovalStep(
    tx: TenantPrisma,
    approval: { id: string; approvalNumber: string; currentStepOrder: number },
    userId: string,
  ): Promise<ApprovalResponseDto> {
    const updated = await tx.approval.update({
      where: { id: approval.id },
      data: { currentStepOrder: approval.currentStepOrder + 1 },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    await this.auditService.record(tx, {
      action: 'APPROVAL_STEP_APPROVED',
      module: 'approvals',
      recordType: 'Approval',
      recordId: approval.id,
      after: {
        approvalNumber: approval.approvalNumber,
        stepOrder: approval.currentStepOrder,
        approverId: userId,
      },
    });

    return mapApprovalToDto(updated);
  }

  private async completeApproval(
    tx: TenantPrisma,
    approval: { id: string; approvalNumber: string; type: string },
    now: Date,
    userId: string,
  ): Promise<ApprovalResponseDto> {
    const updated = await tx.approval.update({
      where: { id: approval.id },
      data: {
        status: 'APPROVED',
        finalDecision: 'APPROVED',
        completedAt: now,
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    const handler = this.approvalsService.getHandler(approval.type);
    if (handler) {
      await handler.execute(tx, updated);
    }

    await this.auditService.record(tx, {
      action: 'APPROVAL_COMPLETED',
      module: 'approvals',
      recordType: 'Approval',
      recordId: approval.id,
      after: {
        approvalNumber: approval.approvalNumber,
        status: 'APPROVED',
        finalDecision: 'APPROVED',
        approverId: userId,
      },
    });

    return mapApprovalToDto(updated);
  }

  async approve(
    companyId: string,
    id: string,
    userId: string,
    userPermissions: readonly string[],
    comments?: string,
  ): Promise<ApprovalResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const approval = await tx.approval.findFirst({
        where: { id, companyId, deletedAt: null },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      const currentStep = this.validateApprovalStep(approval, id, userId, userPermissions);

      const now = new Date();
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: 'APPROVED',
          approverId: userId,
          decidedAt: now,
          decision: 'APPROVED',
          comments: comments?.trim() || null,
        },
      });

      if (approval!.currentStepOrder < approval!.totalSteps) {
        return this.advanceApprovalStep(tx, approval!, userId);
      }

      return this.completeApproval(tx, approval!, now, userId);
    });
  }

  async reject(
    companyId: string,
    id: string,
    userId: string,
    userPermissions: readonly string[],
    reason: string,
  ): Promise<ApprovalResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const approval = await tx.approval.findFirst({
        where: { id, companyId, deletedAt: null },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
      if (!approval) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Approval request "${id}" not found`,
        });
      }

      if (approval.status !== 'PENDING') {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: `Cannot reject request in "${approval.status}" status. Only PENDING requests may be rejected.`,
        });
      }

      // Maker-checker rule: Requester cannot reject their own request
      if (approval.requesterId === userId) {
        throw new ForbiddenException({
          code: ERROR_CODES.SELF_APPROVAL_FORBIDDEN,
          message: 'Requester cannot reject their own request',
        });
      }

      const currentStep = approval.steps.find(
        (s) => s.stepOrder === approval.currentStepOrder && s.status === 'PENDING',
      );
      if (!currentStep) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'No pending step found for the current approval stage',
        });
      }

      if (!canPermissionApprove(userPermissions, currentStep.requiredPermission)) {
        throw new ForbiddenException({
          code: ERROR_CODES.FORBIDDEN,
          message: `User lacks required authority ("${currentStep.requiredPermission}") to reject this step`,
        });
      }

      const now = new Date();
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: 'REJECTED',
          approverId: userId,
          decidedAt: now,
          decision: 'REJECTED',
          comments: reason.trim(),
        },
      });

      const updated = await tx.approval.update({
        where: { id },
        data: {
          status: 'REJECTED',
          finalDecision: 'REJECTED',
          rejectionReason: reason.trim(),
          completedAt: now,
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });

      await this.auditService.record(tx, {
        action: 'APPROVAL_REJECTED',
        module: 'approvals',
        recordType: 'Approval',
        recordId: id,
        after: {
          approvalNumber: approval.approvalNumber,
          status: 'REJECTED',
          rejectedById: userId,
          reason,
        },
      });

      return mapApprovalToDto(updated);
    });
  }
}
