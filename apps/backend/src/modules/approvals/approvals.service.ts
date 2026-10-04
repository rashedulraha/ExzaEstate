import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { SequenceService } from '../../platform/sequence/sequence.service.js';
import type { ApprovalHandler } from './approval-handler.interface.js';
import { ApprovalRequiredException } from './approval-required.exception.js';
import type { RequestApprovalInput } from './approval-request.types.js';
import { createMultiUserApproval, createSingleUserApproval } from './approvals-create.helper.js';
import type { RequestApprovalResultDto } from './dto/index.js';

export type { RequestApprovalInput };

function matchesPercentage(
  r: { minPercentage: Prisma.Decimal | null; maxPercentage: Prisma.Decimal | null },
  percentage?: number,
): boolean {
  if (percentage === undefined) return true;
  if (r.minPercentage !== null && Number(r.minPercentage) > percentage) return false;
  if (r.maxPercentage !== null && Number(r.maxPercentage) < percentage) return false;
  return true;
}

function matchesAmount(
  r: { minAmountPaisa: bigint; maxAmountPaisa: bigint | null },
  amountPaisa?: bigint,
): boolean {
  if (amountPaisa === undefined) return true;
  if (r.minAmountPaisa > amountPaisa) return false;
  if (r.maxAmountPaisa !== null && r.maxAmountPaisa < amountPaisa) return false;
  return true;
}

function matchesScope(
  r: { projectId: string | null; branchId: string | null },
  projectId?: string,
  branchId?: string,
): boolean {
  if (r.projectId && projectId && r.projectId !== projectId) return false;
  if (r.branchId && branchId && r.branchId !== branchId) return false;
  return true;
}

function normalizeApprovalInput(input: RequestApprovalInput) {
  const type = input.type ?? input.approvalType ?? 'GENERAL';
  const title = input.title ?? `${type} Approval Request`;
  const amountPaisa = input.amountPaisa ?? input.amount ?? null;
  const payload = (input.payload ?? {}) as Prisma.InputJsonValue;
  return {
    type,
    title,
    amountPaisa,
    payload,
    normalized: { ...input, type, title, amountPaisa: amountPaisa ?? undefined, payload },
  };
}

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);
  private readonly handlers = new Map<string, ApprovalHandler>();

  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
  ) {}

  registerHandler(type: string, handler: ApprovalHandler): void {
    this.handlers.set(type, handler);
    this.logger.log(`Registered approval handler for type: "${type}"`);
  }

  getHandler(type: string): ApprovalHandler | undefined {
    return this.handlers.get(type);
  }

  private async findMatchingRules(
    tx: TenantPrisma,
    companyId: string,
    input: RequestApprovalInput,
  ) {
    const rules = await tx.approvalRule.findMany({
      where: {
        companyId,
        type: input.type,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { stepOrder: 'asc' },
    });

    return rules.filter(
      (r) =>
        matchesPercentage(r, input.percentage) &&
        matchesAmount(r, input.amountPaisa) &&
        matchesScope(r, input.projectId, input.branchId),
    );
  }

  private async checkSingleUserMode(tx: TenantPrisma, companyId: string): Promise<boolean> {
    const activeUsersCount = await tx.user.count({
      where: { companyId, status: 'ACTIVE' },
    });
    if (activeUsersCount === 1) {
      return true;
    }

    const setting = await tx.companySetting.findUnique({
      where: { companyId_key: { companyId, key: 'single_user_auto_approve' } },
    });
    return setting?.value === true || setting?.value === 'true';
  }

  private async processApprovalRequest(
    tx: TenantPrisma,
    companyId: string,
    norm: ReturnType<typeof normalizeApprovalInput>,
  ): Promise<RequestApprovalResultDto> {
    const matchingRules = await this.findMatchingRules(tx, companyId, norm.normalized);
    if (matchingRules.length === 0) {
      return { required: false };
    }

    const fiscalYear = new Date().getFullYear().toString();
    const seqVal = await this.sequenceService.next(tx, {
      type: 'APPROVAL',
      fiscalYear,
    });
    const approvalNumber = this.sequenceService.format({
      prefix: 'APP',
      fiscalYear,
      value: seqVal,
      padding: 5,
    });
    const isSingleUser = await this.checkSingleUserMode(tx, companyId);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const params = {
      tx,
      input: norm.normalized,
      approvalNumber,
      type: norm.type,
      title: norm.title,
      amountPaisa: norm.amountPaisa,
      payload: norm.payload,
      expiresAt,
    };

    if (isSingleUser) {
      const handler = this.getHandler(norm.type);
      const approval = await createSingleUserApproval(params, handler);

      await this.auditService.record(tx, {
        action: 'APPROVAL_AUTO_APPROVED',
        module: 'approvals',
        recordType: 'Approval',
        recordId: approval.id,
        after: {
          approvalNumber,
          type: norm.type,
          status: 'AUTO_APPROVED',
          autoApproved: true,
        },
      });

      return {
        required: true,
        approvalId: approval.id,
        approvalNumber,
        status: 'AUTO_APPROVED',
        autoApproved: true,
      };
    }

    // Multi-user maker-checker pending workflow
    const approval = await createMultiUserApproval(params, matchingRules);

    await this.auditService.record(tx, {
      action: 'APPROVAL_REQUESTED',
      module: 'approvals',
      recordType: 'Approval',
      recordId: approval.id,
      after: {
        approvalNumber,
        type: norm.type,
        status: 'PENDING',
        stepsCount: matchingRules.length,
      },
    });

    return {
      required: true,
      approvalId: approval.id,
      approvalNumber,
      status: 'PENDING',
      autoApproved: false,
    };
  }

  async request(input: RequestApprovalInput): Promise<RequestApprovalResultDto> {
    const norm = normalizeApprovalInput(input);
    const result = await this.tenantDb.withCompany(input.companyId, async (tx) => {
      return this.processApprovalRequest(tx, input.companyId, norm);
    });

    if (result.required && !result.autoApproved && input.throwOnRequired !== false) {
      throw new ApprovalRequiredException(result.approvalId!, result.approvalNumber);
    }

    return result;
  }
}
