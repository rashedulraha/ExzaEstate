import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { mapApprovalToDto } from './approvals.mapper.js';
import type { ApprovalResponseDto } from './dto/index.js';
import { ApprovalsService } from './approvals.service.js';

@Injectable()
export class ApprovalsOverrideService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly approvalsService: ApprovalsService,
    private readonly auditService: AuditService,
  ) {}

  async override(
    companyId: string,
    id: string,
    userId: string,
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

      if (approval.status !== 'PENDING' && approval.status !== 'OVERRIDE_PENDING_SECOND_USER') {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: `Cannot override request in "${approval.status}" status. Only PENDING requests may be overridden.`,
        });
      }

      if (new Date(approval.expiresAt).getTime() < Date.now()) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Approval request has expired and cannot be overridden',
        });
      }

      const now = new Date();

      // Step 1: First user joint override initiation
      if (!approval.overrideFirstUserId) {
        const updated = await tx.approval.update({
          where: { id },
          data: {
            status: 'OVERRIDE_PENDING_SECOND_USER',
            overrideFirstUserId: userId,
            overrideFirstAt: now,
            overrideFirstReason: reason.trim(),
          },
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        });

        await this.auditService.record(tx, {
          action: 'APPROVAL_OVERRIDE_INITIATED',
          module: 'approvals',
          recordType: 'Approval',
          recordId: id,
          after: {
            approvalNumber: approval.approvalNumber,
            overrideFirstUserId: userId,
            reason,
          },
        });

        return mapApprovalToDto(updated);
      }

      // Step 2: Second user joint override confirmation
      if (approval.overrideFirstUserId === userId) {
        throw new ForbiddenException({
          code: ERROR_CODES.SELF_APPROVAL_FORBIDDEN,
          message:
            'Joint control strictly requires two distinct authorized users to confirm override (MD + GM)',
        });
      }

      // Mark all pending steps as OVERRIDDEN
      await tx.approvalStep.updateMany({
        where: { approvalId: id, status: 'PENDING' },
        data: {
          status: 'OVERRIDDEN',
          approverId: userId,
          decidedAt: now,
          decision: 'OVERRIDDEN',
          comments: `Joint override completed by ${userId}: ${reason.trim()}`,
        },
      });

      const updated = await tx.approval.update({
        where: { id },
        data: {
          status: 'OVERRIDDEN',
          finalDecision: 'OVERRIDDEN',
          overrideSecondUserId: userId,
          overrideSecondAt: now,
          overrideSecondReason: reason.trim(),
          completedAt: now,
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });

      // Resume action inside this transaction
      const handler = this.approvalsService.getHandler(approval.type);
      if (handler) {
        await handler.execute(tx, updated);
      }

      await this.auditService.record(tx, {
        action: 'APPROVAL_OVERRIDDEN',
        module: 'approvals',
        recordType: 'Approval',
        recordId: id,
        after: {
          approvalNumber: approval.approvalNumber,
          firstUserId: approval.overrideFirstUserId,
          secondUserId: userId,
          reason,
        },
      });

      return mapApprovalToDto(updated);
    });
  }
}
