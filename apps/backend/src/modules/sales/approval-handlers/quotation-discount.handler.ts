import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Approval } from '@prisma/client';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { ApprovalHandler, ApprovalsService } from '../../approvals/index.js';

@Injectable()
export class QuotationDiscountApprovalHandler implements ApprovalHandler, OnModuleInit {
  private readonly logger = new Logger(QuotationDiscountApprovalHandler.name);

  constructor(private readonly approvalsService: ApprovalsService) {}

  onModuleInit(): void {
    this.approvalsService.registerHandler('DISCOUNT', this);
    this.approvalsService.registerHandler('PRICE_EXCEPTION', this);
    this.logger.log(
      'Registered quotation discount approval handlers for DISCOUNT and PRICE_EXCEPTION',
    );
  }

  async execute(tx: TenantPrisma, approval: Approval): Promise<void> {
    if (approval.entityType !== 'Quotation' || !approval.entityId) {
      return;
    }

    const quotation = await tx.quotation.findFirst({
      where: { id: approval.entityId, companyId: approval.companyId, deletedAt: null },
    });

    if (!quotation) {
      this.logger.warn(
        `Quotation "${approval.entityId}" not found during approval completion callback for approval "${approval.id}"`,
      );
      return;
    }

    const isApproved =
      approval.status === 'APPROVED' ||
      approval.status === 'AUTO_APPROVED' ||
      approval.status === 'OVERRIDDEN';

    if (isApproved) {
      await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          status: 'Approved',
          approvalStatus: 'APPROVED',
          approvedById: approval.overrideSecondUserId || approval.requesterId,
          approvedAt: new Date(),
        },
      });
      this.logger.log(
        `Quotation "${quotation.id}" marked Approved following approval "${approval.id}"`,
      );
    } else if (approval.status === 'REJECTED') {
      await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          status: 'Rejected',
          approvalStatus: 'REJECTED',
          rejectionReason: approval.rejectionReason || 'Rejected by management',
        },
      });
      this.logger.log(
        `Quotation "${quotation.id}" marked Rejected following approval "${approval.id}"`,
      );
    }
  }
}
