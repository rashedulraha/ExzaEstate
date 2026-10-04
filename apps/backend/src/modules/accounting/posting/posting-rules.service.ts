import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { DEFAULT_POSTING_RULES } from '../../../platform/tenant-provisioning/steps/default-posting-rules.data.js';
import { UpdatePostingRuleDto } from './dto/update-posting-rule.dto.js';
import { PostingRuleResponseDto } from './dto/posting-rule-response.dto.js';

@Injectable()
export class PostingRulesService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
  ) {}

  async findAll(companyId: string): Promise<PostingRuleResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const rules = await tx.postingRule.findMany({
        where: { companyId },
        orderBy: { eventType: 'asc' },
      });

      return rules.map((r) => this.mapToDto(r));
    });
  }

  async findByEventType(companyId: string, eventType: string): Promise<PostingRuleResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const rule = await tx.postingRule.findUnique({
        where: {
          companyId_eventType: { companyId, eventType },
        },
      });

      if (!rule) {
        throw new NotFoundException(`Posting rule for event "${eventType}" not found`);
      }

      return this.mapToDto(rule);
    });
  }

  async update(
    companyId: string,
    _userId: string,
    eventType: string,
    dto: UpdatePostingRuleDto,
  ): Promise<PostingRuleResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.postingRule.findUnique({
        where: {
          companyId_eventType: { companyId, eventType },
        },
      });

      if (!existing) {
        throw new NotFoundException(`Posting rule for event "${eventType}" not found`);
      }

      const updated = await tx.postingRule.update({
        where: { id: existing.id },
        data: {
          ruleName: dto.ruleName,
          description: dto.description,
          debitAccountCode: dto.debitAccountCode,
          creditAccountCode: dto.creditAccountCode,
          accountMappings: dto.accountMappings
            ? (dto.accountMappings as Record<string, string>)
            : undefined,
          isActive: dto.isActive,
        },
      });

      await this.auditService.record(tx, {
        action: 'POSTING_RULE_UPDATED',
        module: 'accounting',
        recordType: 'PostingRule',
        recordId: updated.id,
        before: {
          ruleName: existing.ruleName,
          isActive: existing.isActive,
          accountMappings: existing.accountMappings,
        },
        after: {
          ruleName: updated.ruleName,
          isActive: updated.isActive,
          accountMappings: updated.accountMappings,
        },
      });

      return this.mapToDto(updated);
    });
  }

  async delete(companyId: string, _userId: string, eventType: string): Promise<void> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.postingRule.findUnique({
        where: {
          companyId_eventType: { companyId, eventType },
        },
      });

      if (!existing) {
        throw new NotFoundException(`Posting rule for event "${eventType}" not found`);
      }

      await tx.postingRule.delete({
        where: { id: existing.id },
      });

      await this.auditService.record(tx, {
        action: 'POSTING_RULE_DELETED',
        module: 'accounting',
        recordType: 'PostingRule',
        recordId: existing.id,
        before: { eventType: existing.eventType, ruleName: existing.ruleName },
      });
    });
  }

  async resetToDefaults(companyId: string, _userId: string): Promise<void> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      for (const rule of DEFAULT_POSTING_RULES) {
        await tx.postingRule.upsert({
          where: {
            companyId_eventType: { companyId, eventType: rule.eventType },
          },
          update: {
            ruleName: rule.ruleName,
            description: rule.description,
            debitAccountCode: rule.debitAccountCode,
            creditAccountCode: rule.creditAccountCode,
            accountMappings: rule.accountMappings,
            isActive: true,
          },
          create: {
            companyId,
            eventType: rule.eventType,
            ruleName: rule.ruleName,
            description: rule.description,
            debitAccountCode: rule.debitAccountCode,
            creditAccountCode: rule.creditAccountCode,
            accountMappings: rule.accountMappings,
            isActive: true,
          },
        });
      }

      await this.auditService.record(tx, {
        action: 'POSTING_RULES_RESET',
        module: 'accounting',
        recordType: 'PostingRule',
        recordId: companyId,
        after: { count: DEFAULT_POSTING_RULES.length },
      });
    });
  }

  private mapToDto(rule: {
    id: string;
    companyId: string;
    eventType: string;
    ruleName: string;
    description: string | null;
    debitAccountCode: string | null;
    creditAccountCode: string | null;
    accountMappings: unknown;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): PostingRuleResponseDto {
    return {
      id: rule.id,
      companyId: rule.companyId,
      eventType: rule.eventType,
      ruleName: rule.ruleName,
      description: rule.description,
      debitAccountCode: rule.debitAccountCode,
      creditAccountCode: rule.creditAccountCode,
      accountMappings: (rule.accountMappings as Record<string, string>) ?? {},
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
