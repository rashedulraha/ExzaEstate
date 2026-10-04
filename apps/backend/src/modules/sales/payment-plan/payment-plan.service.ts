import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { buildSchedule } from '../domain/installment-schedule-engine.js';
import type {
  CreatePaymentPlanTemplateDto,
  PaymentPlanTemplateListResponseDto,
  PaymentPlanTemplateResponseDto,
  PreviewScheduleDto,
  QueryPaymentPlanTemplatesDto,
  SchedulePreviewResponseDto,
  UpdatePaymentPlanTemplateDto,
} from '../dto/index.js';
import {
  buildCreateTemplateData,
  buildUpdateTemplateData,
  computeScheduleAmounts,
  resolvePreviewConfig,
} from './payment-plan.helper.js';
import { mapScheduleToResponseDto, mapTemplateToDto } from './payment-plan.mapper.js';

@Injectable()
export class PaymentPlanService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
  ) {}

  async previewSchedule(
    companyId: string,
    dto: PreviewScheduleDto,
  ): Promise<SchedulePreviewResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      let template = null;
      if (dto.templateId) {
        template = await tx.paymentPlanTemplate.findFirst({
          where: { id: dto.templateId, companyId, deletedAt: null },
        });
      }

      const config = resolvePreviewConfig(dto, template);
      const netPricePaisa = BigInt(dto.netPricePaisa);
      const amounts = computeScheduleAmounts(dto, netPricePaisa, config.downPaymentPct);

      const result = buildSchedule({
        netPricePaisa,
        bookingAmountPaisa: amounts.bookingAmountPaisa,
        downPaymentPaisa: amounts.downPaymentPaisa,
        installmentCount: config.installmentCount,
        firstDueDate: dto.firstDueDate,
        frequency: config.frequency,
        customMilestones: config.customMilestones,
        minBookingPct: config.minBookingPct,
      });

      return mapScheduleToResponseDto(result);
    });
  }

  async createTemplate(
    companyId: string,
    dto: CreatePaymentPlanTemplateDto,
    userId?: string,
  ): Promise<PaymentPlanTemplateResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const code = dto.code.trim().toUpperCase();

      const existing = await tx.paymentPlanTemplate.findFirst({
        where: { companyId, code, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: `Payment plan template with code "${code}" already exists`,
        });
      }

      if (dto.isDefault) {
        await tx.paymentPlanTemplate.updateMany({
          where: { companyId, isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });
      }

      const data = buildCreateTemplateData(companyId, code, dto, userId);
      const template = await tx.paymentPlanTemplate.create({ data });

      await this.auditService.record(tx, {
        action: 'PAYMENT_PLAN_TEMPLATE_CREATED',
        module: 'sales',
        recordType: 'PaymentPlanTemplate',
        recordId: template.id,
        after: { code, name: template.name, isDefault: template.isDefault },
      });

      return mapTemplateToDto(template);
    });
  }

  async getTemplates(
    companyId: string,
    query: QueryPaymentPlanTemplatesDto,
  ): Promise<PaymentPlanTemplateListResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = query.page && query.page > 0 ? query.page : 1;
      const limit = query.limit && query.limit > 0 ? query.limit : 50;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {
        companyId,
        deletedAt: null,
      };

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      if (query.search?.trim()) {
        const search = query.search.trim();
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        tx.paymentPlanTemplate.findMany({
          where,
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          skip,
          take: limit,
        }),
        tx.paymentPlanTemplate.count({ where }),
      ]);

      return {
        items: items.map(mapTemplateToDto),
        total,
        page,
        limit,
      };
    });
  }

  async getTemplateById(companyId: string, id: string): Promise<PaymentPlanTemplateResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const template = await tx.paymentPlanTemplate.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!template) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Payment plan template "${id}" not found`,
        });
      }
      return mapTemplateToDto(template);
    });
  }

  async updateTemplate(
    companyId: string,
    id: string,
    dto: UpdatePaymentPlanTemplateDto,
    userId?: string,
  ): Promise<PaymentPlanTemplateResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.paymentPlanTemplate.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Payment plan template "${id}" not found`,
        });
      }

      if (dto.isDefault) {
        await tx.paymentPlanTemplate.updateMany({
          where: { companyId, isDefault: true, deletedAt: null, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const updateData = buildUpdateTemplateData(dto, userId);
      const updated = await tx.paymentPlanTemplate.update({
        where: { id },
        data: updateData,
      });

      await this.auditService.record(tx, {
        action: 'PAYMENT_PLAN_TEMPLATE_UPDATED',
        module: 'sales',
        recordType: 'PaymentPlanTemplate',
        recordId: id,
        before: { name: existing.name, isActive: existing.isActive },
        after: { name: updated.name, isActive: updated.isActive },
      });

      return mapTemplateToDto(updated);
    });
  }

  async deleteTemplate(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await tx.paymentPlanTemplate.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!existing) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Payment plan template "${id}" not found`,
        });
      }

      if (existing.isDefault) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message:
            'Cannot delete the default payment plan template. Designate another template as default first.',
        });
      }

      await tx.paymentPlanTemplate.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedById: userId || null,
        },
      });

      await this.auditService.record(tx, {
        action: 'PAYMENT_PLAN_TEMPLATE_DELETED',
        module: 'sales',
        recordType: 'PaymentPlanTemplate',
        recordId: id,
        before: { code: existing.code, name: existing.name },
      });

      return { success: true, id };
    });
  }
}
