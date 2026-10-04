import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import type {
  CreateQuotationDto,
  QueryQuotationsDto,
  QuotationListResponseDto,
  QuotationResponseDto,
  UpdateQuotationDto,
} from '../dto/index.js';
import {
  buildQuotationCreateData,
  buildQuotationsWhere,
  calculateValidityDate,
  determineApprovalRequirement,
  generateQuotationNumber,
  resolvePartySummary,
  resolveQuotationPricing,
  validateCustomerAndLead,
} from './quotation.helper.js';
import {
  resolveChargesSnapshot,
  resolveInstallmentsSnapshot,
} from './quotation-snapshot.helper.js';
import { buildQuotationPdfData } from './quotation-pdf.builder.js';
import { mapQuotationToDto } from './quotation.mapper.js';
import { QuotationPdfService } from '../pdf/quotation-pdf.service.js';
import { QuotationLifecycleService } from './quotation-lifecycle.service.js';

@Injectable()
export class QuotationService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly quotationPdfService: QuotationPdfService,
    private readonly lifecycleService: QuotationLifecycleService,
  ) {}

  async createQuotation(
    companyId: string,
    dto: CreateQuotationDto,
    userId?: string,
  ): Promise<QuotationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const property = await tx.property.findFirst({
        where: { id: dto.propertyId, companyId, deletedAt: null },
      });
      if (!property) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Property "${dto.propertyId}" not found`,
        });
      }

      const { customerName, leadName } = await validateCustomerAndLead(
        tx,
        companyId,
        dto.customerId,
        dto.leadId,
      );

      const pricing = resolveQuotationPricing(property, dto);
      const chargesRes = await resolveChargesSnapshot(
        tx,
        companyId,
        pricing.netPricePaisa,
        dto.charges,
      );

      const installmentsSnapshot = await resolveInstallmentsSnapshot(
        tx,
        companyId,
        pricing.netPricePaisa,
        dto.paymentPlanTemplateId,
        dto.installmentCount,
        dto.bookingAmountPaisa,
        dto.firstDueDate,
        dto.frequency,
      );

      const validUntil = calculateValidityDate(dto.validUntil, dto.validDays);
      const approval = determineApprovalRequirement(pricing.discountPct, 0);
      const quotationNumber = await generateQuotationNumber(tx, this.sequenceService);

      const createData = buildQuotationCreateData({
        companyId,
        quotationNumber,
        status: approval.status,
        approval,
        validUntil,
        pricing,
        chargesRes,
        installmentsSnapshot,
        dto,
        userId,
      });

      const quotation = await tx.quotation.create({ data: createData });

      await this.auditService.record(tx, {
        action: 'QUOTATION_CREATED',
        module: 'sales',
        recordType: 'Quotation',
        recordId: quotation.id,
        after: {
          quotationNumber,
          status: quotation.status,
          propertyId: dto.propertyId,
          grandTotalPaisa: chargesRes.grandTotalPaisa.toString(),
        },
      });

      return mapQuotationToDto(quotation, {
        property: {
          id: property.id,
          code: property.code,
          title: property.title,
          type: property.type,
          areaSqft: Number(property.areaSqft),
          facing: property.facing,
        },
        party: resolvePartySummary(dto.customerId, customerName, dto.leadId, leadName),
      });
    });
  }

  async getQuotations(
    companyId: string,
    query: QueryQuotationsDto,
  ): Promise<QuotationListResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = query.page && query.page > 0 ? query.page : 1;
      const limit = query.limit && query.limit > 0 ? query.limit : 20;
      const skip = (page - 1) * limit;

      const where = buildQuotationsWhere(companyId, query);
      const [items, total] = await Promise.all([
        tx.quotation.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.quotation.count({ where }),
      ]);

      const propIds = [...new Set(items.map((q) => q.propertyId))];
      const properties = await tx.property.findMany({
        where: { id: { in: propIds }, companyId },
      });
      const propMap = new Map(properties.map((p) => [p.id, p]));

      const dtos = items.map((q) => {
        const p = propMap.get(q.propertyId);
        return mapQuotationToDto(q, {
          property: p
            ? {
                id: p.id,
                code: p.code,
                title: p.title,
                type: p.type,
                areaSqft: Number(p.areaSqft),
                facing: p.facing,
              }
            : undefined,
        });
      });

      return { items: dtos, total, page, limit };
    });
  }

  async getQuotationById(companyId: string, id: string): Promise<QuotationResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const quotation = await tx.quotation.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!quotation) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Quotation "${id}" not found`,
        });
      }

      const property = await tx.property.findFirst({
        where: { id: quotation.propertyId, companyId },
      });

      return mapQuotationToDto(quotation, {
        property: property
          ? {
              id: property.id,
              code: property.code,
              title: property.title,
              type: property.type,
              areaSqft: Number(property.areaSqft),
              facing: property.facing,
            }
          : undefined,
      });
    });
  }

  async generatePdf(companyId: string, id: string): Promise<Buffer> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const quotation = await tx.quotation.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!quotation) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Quotation "${id}" not found`,
        });
      }

      const [company, property, customer, lead] = await Promise.all([
        tx.company.findFirst({ where: { id: companyId } }),
        tx.property.findFirst({ where: { id: quotation.propertyId, companyId } }),
        quotation.customerId
          ? tx.customer.findFirst({ where: { id: quotation.customerId, companyId } })
          : null,
        quotation.leadId ? tx.lead.findFirst({ where: { id: quotation.leadId, companyId } }) : null,
      ]);

      const pdfData = buildQuotationPdfData({
        quotation,
        company,
        property,
        customer,
        lead,
      });

      return this.quotationPdfService.generatePdf(pdfData);
    });
  }

  async updateQuotation(
    companyId: string,
    id: string,
    dto: UpdateQuotationDto,
    userId?: string,
  ): Promise<QuotationResponseDto> {
    return this.lifecycleService.updateQuotation(companyId, id, dto, userId);
  }

  async sendQuotation(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<QuotationResponseDto> {
    return this.lifecycleService.sendQuotation(companyId, id, userId);
  }

  async approveQuotation(
    companyId: string,
    id: string,
    userId: string,
  ): Promise<QuotationResponseDto> {
    return this.lifecycleService.approveQuotation(companyId, id, userId);
  }

  async rejectQuotation(
    companyId: string,
    id: string,
    reason: string,
    userId: string,
  ): Promise<QuotationResponseDto> {
    return this.lifecycleService.rejectQuotation(companyId, id, reason, userId);
  }

  async expireOverdueQuotations(companyId: string): Promise<{ expiredCount: number }> {
    return this.lifecycleService.expireOverdueQuotations(companyId);
  }

  async deleteQuotation(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.lifecycleService.deleteQuotation(companyId, id, userId);
  }
}
