import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { DOMAIN_EVENTS, ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import { SequenceService } from '../../platform/sequence/sequence.service.js';
import { evaluateCustomerKyc } from './customer-kyc.helper.js';
import { mapCustomerDetailResponse } from './customer.mapper.js';
import type { CustomerScopeContext } from './customer-scope.helper.js';
import {
  assertNoDuplicateCustomerPhone,
  buildCustomerCreateData,
  buildCustomerUpdateData,
  createInitialCustomerRelations,
  CUSTOMER_DETAIL_INCLUDE,
  findAndScopeCustomer,
  generateCustomerNumber,
} from './customer-service.helper.js';
import type {
  AttachCustomerDocumentDto,
  CreateCustomerDto,
  CustomerDetailResponseDto,
  UpdateCustomerDto,
  VerifyKycDto,
} from './dto/index.js';

@Injectable()
export class CustomerService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly fieldCrypto: FieldCryptoService,
    private readonly auditService: AuditService,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  async createCustomer(
    companyId: string,
    dto: CreateCustomerDto,
    userId?: string,
  ): Promise<CustomerDetailResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await assertNoDuplicateCustomerPhone(tx, companyId, dto.phone);
      const customerNumber = await generateCustomerNumber(tx, this.sequenceService);
      const createData = buildCustomerCreateData(
        companyId,
        customerNumber,
        dto,
        this.fieldCrypto,
        userId,
      );

      const customer = await tx.customer.create({
        data: createData,
      });

      await createInitialCustomerRelations(tx, companyId, customer.id, dto, this.fieldCrypto);

      await this.auditService.record(tx, {
        module: 'crm',
        entity: 'Customer',
        entityId: customer.id,
        action: 'CRM_CUSTOMER_CREATE',
        newValue: {
          customerNumber: customer.customerNumber,
          name: customer.name,
          phone: customer.phone,
        },
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, DOMAIN_EVENTS.CUSTOMER_CREATED, {
          customerId: customer.id,
          companyId,
          customerNumber: customer.customerNumber,
          name: customer.name,
          phone: customer.phone,
          actorId: userId,
        });
      }

      const fullCustomer = await tx.customer.findUniqueOrThrow({
        where: { id: customer.id },
        include: CUSTOMER_DETAIL_INCLUDE,
      });

      return mapCustomerDetailResponse(fullCustomer, this.fieldCrypto, false);
    });
  }

  async updateCustomer(
    companyId: string,
    id: string,
    dto: UpdateCustomerDto,
    context?: CustomerScopeContext,
    userId?: string,
  ): Promise<CustomerDetailResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const existing = await findAndScopeCustomer(tx, companyId, id, context);

      if (dto.phone && dto.phone !== existing.phone) {
        await assertNoDuplicateCustomerPhone(tx, companyId, dto.phone, id);
      }

      const updateData = buildCustomerUpdateData(companyId, dto, this.fieldCrypto, userId);
      const updated = await tx.customer.update({
        where: { id },
        data: updateData,
        include: CUSTOMER_DETAIL_INCLUDE,
      });

      await this.auditService.record(tx, {
        module: 'crm',
        entity: 'Customer',
        entityId: updated.id,
        action: 'CRM_CUSTOMER_UPDATE',
        newValue: { name: updated.name, phone: updated.phone },
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, DOMAIN_EVENTS.CUSTOMER_UPDATED, {
          customerId: updated.id,
          companyId,
          customerNumber: updated.customerNumber,
          actorId: userId,
        });
      }

      return mapCustomerDetailResponse(updated, this.fieldCrypto, false);
    });
  }

  async deleteCustomer(
    companyId: string,
    id: string,
    context?: CustomerScopeContext,
    userId?: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeCustomer(tx, companyId, id, context);

      await tx.customer.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById: userId ?? null },
      });

      await this.auditService.record(tx, {
        module: 'crm',
        entity: 'Customer',
        entityId: id,
        action: 'CRM_CUSTOMER_DELETE',
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, DOMAIN_EVENTS.CUSTOMER_DELETED, {
          customerId: id,
          companyId,
          actorId: userId,
        });
      }

      return { success: true, id };
    });
  }

  async verifyKyc(
    companyId: string,
    id: string,
    dto: VerifyKycDto,
    context?: CustomerScopeContext,
    userId?: string,
  ): Promise<CustomerDetailResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const customer = await findAndScopeCustomer(tx, companyId, id, context);

      const kycEval = evaluateCustomerKyc({
        customerType: customer.customerType,
        name: customer.name,
        phone: customer.phone,
        isNrb: customer.isNrb,
        nidEncrypted: customer.nidEncrypted,
        passportEncrypted: customer.passportEncrypted,
        tinEncrypted: customer.tinEncrypted,
        addresses: customer.addresses,
        nominees: customer.nominees,
      });

      if (!kycEval.isComplete) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: `KYC verification failed: ${kycEval.missingRequirements.join('; ')}`,
          details: { missingRequirements: kycEval.missingRequirements },
        });
      }

      const updated = await tx.customer.update({
        where: { id },
        data: {
          isKycCompleted: true,
          kycCompletedAt: new Date(),
          kycCompletedById: userId ?? null,
          kycNotes: dto.notes ?? null,
          updatedById: userId ?? null,
        },
        include: CUSTOMER_DETAIL_INCLUDE,
      });

      await this.auditService.record(tx, {
        module: 'crm',
        entity: 'Customer',
        entityId: id,
        action: 'CRM_CUSTOMER_KYC_VERIFY',
        newValue: { isKycCompleted: true, verifiedById: userId, notes: dto.notes },
      });

      if (this.outboxService) {
        await this.outboxService.emit(tx, DOMAIN_EVENTS.CUSTOMER_KYC_VERIFIED, {
          customerId: id,
          companyId,
          actorId: userId,
        });
      }

      return mapCustomerDetailResponse(updated, this.fieldCrypto, false);
    });
  }

  async attachDocument(
    companyId: string,
    customerId: string,
    dto: AttachCustomerDocumentDto,
    context?: CustomerScopeContext,
    userId?: string,
  ): Promise<{ id: string; title: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeCustomer(tx, companyId, customerId, context);

      const doc = await tx.document.create({
        data: {
          companyId,
          title: dto.title.trim(),
          entityType: 'CUSTOMER',
          entityId: customerId,
          category: dto.category ?? null,
          currentVersion: 1,
          createdById: userId ?? null,
          versions: {
            create: {
              companyId,
              version: 1,
              fileKey: dto.fileKey,
              fileName: dto.fileName,
              mimeType: dto.mimeType,
              sizeBytes: BigInt(dto.sizeBytes),
              checksum: dto.checksum ?? null,
              uploadedById: userId ?? null,
            },
          },
        },
      });

      await this.auditService.record(tx, {
        module: 'crm',
        entity: 'Customer',
        entityId: customerId,
        action: 'CRM_CUSTOMER_DOCUMENT_ATTACH',
        newValue: { documentId: doc.id, title: doc.title, category: doc.category },
      });

      return { id: doc.id, title: doc.title };
    });
  }
}
