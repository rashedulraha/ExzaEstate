import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { assertAgreementModifiable, buildAgreementPdfData } from './agreement.helper.js';
import { mapAgreementToDto, mapAgreementTemplateToDto } from './agreement.mapper.js';
import { AgreementPdfService } from './pdf/agreement-pdf.service.js';
import type {
  AgreementResponseDto,
  AgreementTemplateResponseDto,
  CreateAgreementTemplateDto,
  QueryAgreementsDto,
  UpdateAgreementDto,
} from './dto/index.js';

@Injectable()
export class AgreementService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly pdfService: AgreementPdfService,
  ) {}

  async createTemplate(
    companyId: string,
    userId: string,
    dto: CreateAgreementTemplateDto,
  ): Promise<AgreementTemplateResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const template = await tx.agreementTemplate.create({
        data: {
          companyId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          templateBody: dto.templateBody,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
          createdById: userId,
          updatedById: userId,
        },
      });

      await this.auditService.record(tx, {
        action: 'AGREEMENT_TEMPLATE_CREATED',
        module: 'sales',
        recordType: 'AgreementTemplate',
        recordId: template.id,
        after: { code: template.code, name: template.name },
      });

      return mapAgreementTemplateToDto(template);
    });
  }

  async getTemplates(companyId: string): Promise<AgreementTemplateResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const templates = await tx.agreementTemplate.findMany({
        where: { companyId, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      return templates.map(mapAgreementTemplateToDto);
    });
  }

  async updateAgreement(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateAgreementDto,
  ): Promise<AgreementResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const agreement = await tx.agreement.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!agreement) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Agreement "${id}" not found`,
        });
      }

      assertAgreementModifiable(agreement.status);

      const updated = await tx.agreement.update({
        where: { id },
        data: {
          title: dto.title ?? agreement.title,
          content: dto.content ?? agreement.content,
          terms: dto.terms ?? agreement.terms,
          notes: dto.notes ?? agreement.notes,
          updatedById: userId,
        },
      });

      await this.auditService.record(tx, {
        action: 'AGREEMENT_UPDATED',
        module: 'sales',
        recordType: 'Agreement',
        recordId: id,
        after: { title: updated.title, status: updated.status },
      });

      return mapAgreementToDto(updated);
    });
  }

  async getAgreement(companyId: string, id: string): Promise<AgreementResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const agreement = await tx.agreement.findFirst({
        where: { id, companyId, deletedAt: null },
      });
      if (!agreement) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Agreement "${id}" not found`,
        });
      }
      return mapAgreementToDto(agreement);
    });
  }

  async listAgreements(
    companyId: string,
    query: QueryAgreementsDto,
  ): Promise<{ items: AgreementResponseDto[]; total: number; page: number; limit: number }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { companyId, deletedAt: null };
      if (query.bookingId) where.bookingId = query.bookingId;
      if (query.status) where.status = query.status;
      if (query.search) {
        where.OR = [
          { agreementNumber: { contains: query.search.trim(), mode: 'insensitive' } },
          { title: { contains: query.search.trim(), mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        tx.agreement.findMany({
          where,
          orderBy: [{ agreementNumber: 'desc' }, { version: 'desc' }],
          skip,
          take: limit,
        }),
        tx.agreement.count({ where }),
      ]);

      return {
        items: items.map(mapAgreementToDto),
        total,
        page,
        limit,
      };
    });
  }

  async getPdf(companyId: string, id: string): Promise<Buffer> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const agreement = await tx.agreement.findFirst({
        where: { id, companyId, deletedAt: null },
        include: { booking: true },
      });

      if (!agreement) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Agreement "${id}" not found`,
        });
      }

      const [company, customer, property] = await Promise.all([
        tx.company.findFirst({ where: { id: companyId } }),
        tx.customer.findFirst({ where: { id: agreement.booking.customerId, companyId } }),
        tx.property.findFirst({ where: { id: agreement.booking.propertyId, companyId } }),
      ]);

      const pdfData = buildAgreementPdfData({
        agreement,
        company,
        customer,
        property,
      });

      return this.pdfService.generatePdf(pdfData);
    });
  }
}
