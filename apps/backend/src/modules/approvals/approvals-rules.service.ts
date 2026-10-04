import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { mapApprovalRuleToDto } from './approvals.mapper.js';
import type {
  ApprovalRuleResponseDto,
  CreateApprovalRuleDto,
  UpdateApprovalRuleDto,
} from './dto/index.js';

function parseOptionalDecimal(val: number | string | undefined): Prisma.Decimal | null {
  return val !== undefined ? new Prisma.Decimal(val) : null;
}

function parseOptionalBigInt(val: string | undefined): bigint | null {
  return val ? BigInt(val) : null;
}

function buildApprovalRuleCreateData(
  companyId: string,
  dto: CreateApprovalRuleDto,
): Prisma.ApprovalRuleCreateInput {
  return {
    companyId,
    type: dto.type.trim(),
    name: dto.name.trim(),
    description: dto.description?.trim() || null,
    minAmountPaisa: parseOptionalBigInt(dto.minAmountPaisa) ?? 0n,
    maxAmountPaisa: parseOptionalBigInt(dto.maxAmountPaisa),
    minPercentage: parseOptionalDecimal(dto.minPercentage),
    maxPercentage: parseOptionalDecimal(dto.maxPercentage),
    projectId: dto.projectId || null,
    branchId: dto.branchId || null,
    requiredPermission: dto.requiredPermission.trim(),
    stepOrder: dto.stepOrder ?? 1,
    slaHours: dto.slaHours ?? 24,
    isActive: dto.isActive ?? true,
  };
}

@Injectable()
export class ApprovalsRulesService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
  ) {}

  async getRules(companyId: string, type?: string): Promise<ApprovalRuleResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const where: Record<string, unknown> = {
        companyId,
        deletedAt: null,
      };
      if (type) where.type = type;

      const rules = await tx.approvalRule.findMany({
        where,
        orderBy: [{ type: 'asc' }, { stepOrder: 'asc' }],
      });

      return rules.map(mapApprovalRuleToDto);
    });
  }

  async createRule(
    companyId: string,
    dto: CreateApprovalRuleDto,
  ): Promise<ApprovalRuleResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const rule = await tx.approvalRule.create({
        data: buildApprovalRuleCreateData(companyId, dto),
      });

      await this.auditService.record(tx, {
        action: 'APPROVAL_RULE_CREATED',
        module: 'approvals',
        recordType: 'ApprovalRule',
        recordId: rule.id,
        after: {
          type: rule.type,
          name: rule.name,
          requiredPermission: rule.requiredPermission,
        },
      });

      return mapApprovalRuleToDto(rule);
    });
  }

  async updateRule(
    companyId: string,
    id: string,
    dto: UpdateApprovalRuleDto,
  ): Promise<ApprovalRuleResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.approvalRule.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Approval rule "${id}" not found`,
        });
      }

      const data: Record<string, unknown> = {};
      if (dto.name !== undefined) data.name = dto.name.trim();
      if (dto.description !== undefined)
        data.description = dto.description ? dto.description.trim() : null;
      if (dto.requiredPermission !== undefined)
        data.requiredPermission = dto.requiredPermission.trim();
      if (dto.slaHours !== undefined) data.slaHours = dto.slaHours;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;

      const updated = await tx.approvalRule.update({
        where: { id },
        data,
      });

      await this.auditService.record(tx, {
        action: 'APPROVAL_RULE_UPDATED',
        module: 'approvals',
        recordType: 'ApprovalRule',
        recordId: id,
        before: { name: existing.name, isActive: existing.isActive },
        after: { name: updated.name, isActive: updated.isActive },
      });

      return mapApprovalRuleToDto(updated);
    });
  }

  async deleteRule(companyId: string, id: string): Promise<{ success: boolean; id: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.approvalRule.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Approval rule "${id}" not found`,
        });
      }

      await tx.approvalRule.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      await this.auditService.record(tx, {
        action: 'APPROVAL_RULE_DELETED',
        module: 'approvals',
        recordType: 'ApprovalRule',
        recordId: id,
        before: { name: existing.name, type: existing.type },
      });

      return { success: true, id };
    });
  }
}
