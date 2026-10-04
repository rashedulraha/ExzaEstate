import { ConflictException, Injectable, Optional } from '@nestjs/common';
import { DOMAIN_EVENTS, ERROR_CODES, LEAD_STATUSES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import { SequenceService } from '../../platform/sequence/sequence.service.js';
import { mapCustomerDetailResponse } from './customer.mapper.js';
import { CUSTOMER_DETAIL_INCLUDE, generateCustomerNumber } from './customer-service.helper.js';
import { findAndScopeLead } from './crm-service.helper.js';
import type { ScopeContext } from './crm-scope.helper.js';
import type { ConvertLeadDto, CustomerDetailResponseDto } from './dto/index.js';
import {
  buildLeadConversionCustomerData,
  cleanText,
  type LeadConversionLeadRecord,
} from './lead-conversion.helper.js';

interface LeadConversionParams {
  companyId: string;
  lead: LeadConversionLeadRecord;
  dto: ConvertLeadDto;
  userId?: string;
}

@Injectable()
export class LeadConversionService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly fieldCrypto: FieldCryptoService,
    private readonly auditService: AuditService,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  async convertLead(
    companyId: string,
    leadId: string,
    dto: ConvertLeadDto,
    userId?: string,
    context?: ScopeContext,
  ): Promise<CustomerDetailResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const lead = await findAndScopeLead(tx, leadId, companyId, context);

      const existingByLead = await tx.customer.findFirst({
        where: { companyId, leadId: lead.id, deletedAt: null },
        include: CUSTOMER_DETAIL_INCLUDE,
      });
      if (existingByLead) {
        return mapCustomerDetailResponse(existingByLead, this.fieldCrypto, false);
      }

      const existingByPhone = await tx.customer.findFirst({
        where: { companyId, phone: lead.phone, deletedAt: null },
        include: CUSTOMER_DETAIL_INCLUDE,
      });
      if (existingByPhone) {
        return this.handleExistingPhoneCustomer(tx, companyId, lead, existingByPhone, dto, userId);
      }

      return this.createNewCustomerFromLead(tx, { companyId, lead, dto, userId });
    });
  }

  private async handleExistingPhoneCustomer(
    tx: TenantPrisma,
    companyId: string,
    lead: { id: string; status: string; phone: string; name: string },
    existing: { id: string; leadId: string | null; customerNumber: string; name: string },
    dto: ConvertLeadDto,
    userId?: string,
  ): Promise<CustomerDetailResponseDto> {
    if (existing.leadId) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: `A customer with phone "${lead.phone}" already exists (${existing.customerNumber} - ${existing.name})`,
      });
    }

    await tx.customer.update({
      where: { id: existing.id },
      data: { leadId: lead.id, updatedById: userId ?? null },
    });

    await tx.followUp.updateMany({
      where: { companyId, leadId: lead.id, deletedAt: null },
      data: { customerId: existing.id },
    });

    await this.finalizeLeadStatus(tx, companyId, lead.id, lead.status, dto.notes, userId);

    await this.auditService.record(tx, {
      module: 'crm',
      recordType: 'Lead',
      recordId: lead.id,
      action: 'LEAD_CONVERTED',
      before: { status: lead.status },
      after: { status: LEAD_STATUSES.CUSTOMER, customerId: existing.id },
    });

    if (this.outboxService) {
      await this.outboxService.emit(tx, DOMAIN_EVENTS.LEAD_CONVERTED, {
        leadId: lead.id,
        customerId: existing.id,
        customerNumber: existing.customerNumber,
        companyId,
        actorId: userId,
      });
    }

    const updated = await tx.customer.findUniqueOrThrow({
      where: { id: existing.id },
      include: CUSTOMER_DETAIL_INCLUDE,
    });
    return mapCustomerDetailResponse(updated, this.fieldCrypto, false);
  }

  private async createNewCustomerFromLead(
    tx: TenantPrisma,
    params: LeadConversionParams,
  ): Promise<CustomerDetailResponseDto> {
    const { companyId, lead, dto, userId } = params;
    const customerNumber = await generateCustomerNumber(tx, this.sequenceService);
    const data = buildLeadConversionCustomerData(
      companyId,
      customerNumber,
      lead,
      dto,
      this.fieldCrypto,
      userId,
    );

    const customer = await tx.customer.create({ data });

    await tx.customerContact.create({
      data: {
        companyId,
        customerId: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        isPrimary: true,
        relationship: 'Self',
      },
    });

    await this.createCustomerAddressIfProvided(tx, companyId, customer.id, dto);

    await tx.followUp.updateMany({
      where: { companyId, leadId: lead.id, deletedAt: null },
      data: { customerId: customer.id },
    });

    await this.finalizeLeadStatus(tx, companyId, lead.id, lead.status, dto.notes, userId);
    await this.emitConversionAuditAndOutbox(tx, companyId, lead, customer, userId);

    const fullCustomer = await tx.customer.findUniqueOrThrow({
      where: { id: customer.id },
      include: CUSTOMER_DETAIL_INCLUDE,
    });

    return mapCustomerDetailResponse(fullCustomer, this.fieldCrypto, false);
  }

  private async createCustomerAddressIfProvided(
    tx: TenantPrisma,
    companyId: string,
    customerId: string,
    dto: ConvertLeadDto,
  ): Promise<void> {
    const addressLine1 = cleanText(dto.addressLine1);
    const city = cleanText(dto.city);
    if (!addressLine1 || !city) return;

    await tx.customerAddress.create({
      data: {
        companyId,
        customerId,
        type: 'PRESENT',
        addressLine1,
        addressLine2: cleanText(dto.addressLine2),
        city,
        division: cleanText(dto.division),
        postalCode: cleanText(dto.postalCode),
        country: cleanText(dto.country) ?? 'Bangladesh',
        isPrimary: true,
      },
    });
  }

  private async finalizeLeadStatus(
    tx: TenantPrisma,
    companyId: string,
    leadId: string,
    fromStatus: string,
    notes?: string,
    userId?: string,
  ): Promise<void> {
    await tx.lead.update({
      where: { id: leadId },
      data: { status: LEAD_STATUSES.CUSTOMER, updatedById: userId ?? null },
    });
    await tx.leadStatusHistory.create({
      data: {
        companyId,
        leadId,
        fromStatus,
        toStatus: LEAD_STATUSES.CUSTOMER,
        reason: cleanText(notes) ?? 'Converted to Customer',
        changedById: userId ?? null,
      },
    });
  }

  private async emitConversionAuditAndOutbox(
    tx: TenantPrisma,
    companyId: string,
    lead: { id: string; status: string },
    customer: {
      id: string;
      customerNumber: string;
      name: string;
      phone: string;
      leadId: string | null;
    },
    userId?: string,
  ): Promise<void> {
    await this.auditService.record(tx, {
      module: 'crm',
      recordType: 'Lead',
      recordId: lead.id,
      action: 'LEAD_CONVERTED',
      before: { status: lead.status },
      after: {
        status: LEAD_STATUSES.CUSTOMER,
        customerId: customer.id,
        customerNumber: customer.customerNumber,
      },
    });
    await this.auditService.record(tx, {
      module: 'crm',
      recordType: 'Customer',
      recordId: customer.id,
      action: 'CRM_CUSTOMER_CREATE',
      after: {
        customerNumber: customer.customerNumber,
        name: customer.name,
        phone: customer.phone,
        leadId: lead.id,
      },
    });

    if (this.outboxService) {
      await this.outboxService.emit(tx, DOMAIN_EVENTS.LEAD_CONVERTED, {
        leadId: lead.id,
        customerId: customer.id,
        customerNumber: customer.customerNumber,
        companyId,
        actorId: userId,
      });
      await this.outboxService.emit(tx, DOMAIN_EVENTS.CUSTOMER_CREATED, {
        customerId: customer.id,
        companyId,
        customerNumber: customer.customerNumber,
        name: customer.name,
        phone: customer.phone,
        actorId: userId,
      });
    }
  }
}
