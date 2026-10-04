import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import { buildNomineeCreateData, buildCoBuyerCreateData } from './customer-relation.helper.js';
import {
  mapCustomerAddress,
  mapCustomerCoBuyer,
  mapCustomerContact,
  mapCustomerNominee,
} from './customer.mapper.js';
import type { CustomerScopeContext } from './customer-scope.helper.js';
import { findAndScopeCustomer } from './customer-service.helper.js';
import type {
  CreateCustomerAddressDto,
  CreateCustomerCoBuyerDto,
  CreateCustomerContactDto,
  CreateCustomerNomineeDto,
  CustomerAddressResponseDto,
  CustomerCoBuyerResponseDto,
  CustomerContactResponseDto,
  CustomerNomineeResponseDto,
} from './dto/index.js';

@Injectable()
export class CustomerRelationService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly fieldCrypto: FieldCryptoService,
  ) {}

  async addContact(
    companyId: string,
    customerId: string,
    dto: CreateCustomerContactDto,
    context?: CustomerScopeContext,
  ): Promise<CustomerContactResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeCustomer(tx, companyId, customerId, context);

      const contact = await tx.customerContact.create({
        data: {
          companyId,
          customerId,
          name: dto.name.trim(),
          relationship: dto.relationship?.trim() ?? null,
          phone: dto.phone.trim(),
          email: dto.email?.trim() ?? null,
          isPrimary: dto.isPrimary ?? false,
        },
      });

      return mapCustomerContact(contact);
    });
  }

  async deleteContact(
    companyId: string,
    customerId: string,
    contactId: string,
    context?: CustomerScopeContext,
  ): Promise<{ success: boolean; id: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeCustomer(tx, companyId, customerId, context);

      const contact = await tx.customerContact.findFirst({
        where: { id: contactId, customerId, companyId, deletedAt: null },
      });
      if (!contact) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Contact with ID "${contactId}" not found`,
        });
      }

      await tx.customerContact.update({
        where: { id: contactId },
        data: { deletedAt: new Date() },
      });

      return { success: true, id: contactId };
    });
  }

  async addAddress(
    companyId: string,
    customerId: string,
    dto: CreateCustomerAddressDto,
    context?: CustomerScopeContext,
  ): Promise<CustomerAddressResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeCustomer(tx, companyId, customerId, context);

      const address = await tx.customerAddress.create({
        data: {
          companyId,
          customerId,
          type: dto.type,
          addressLine1: dto.addressLine1.trim(),
          addressLine2: dto.addressLine2?.trim() ?? null,
          city: dto.city.trim(),
          division: dto.division?.trim() ?? null,
          postalCode: dto.postalCode?.trim() ?? null,
          country: dto.country?.trim() ?? 'Bangladesh',
          isPrimary: dto.isPrimary ?? false,
        },
      });

      return mapCustomerAddress(address);
    });
  }

  async deleteAddress(
    companyId: string,
    customerId: string,
    addressId: string,
    context?: CustomerScopeContext,
  ): Promise<{ success: boolean; id: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeCustomer(tx, companyId, customerId, context);

      const address = await tx.customerAddress.findFirst({
        where: { id: addressId, customerId, companyId, deletedAt: null },
      });
      if (!address) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Address with ID "${addressId}" not found`,
        });
      }

      await tx.customerAddress.update({
        where: { id: addressId },
        data: { deletedAt: new Date() },
      });

      return { success: true, id: addressId };
    });
  }

  async addNominee(
    companyId: string,
    customerId: string,
    dto: CreateCustomerNomineeDto,
    context?: CustomerScopeContext,
  ): Promise<CustomerNomineeResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeCustomer(tx, companyId, customerId, context);

      const nominee = await tx.customerNominee.create({
        data: buildNomineeCreateData(companyId, customerId, dto, this.fieldCrypto),
      });

      return mapCustomerNominee(nominee, this.fieldCrypto, false);
    });
  }

  async deleteNominee(
    companyId: string,
    customerId: string,
    nomineeId: string,
    context?: CustomerScopeContext,
  ): Promise<{ success: boolean; id: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeCustomer(tx, companyId, customerId, context);

      const nominee = await tx.customerNominee.findFirst({
        where: { id: nomineeId, customerId, companyId, deletedAt: null },
      });
      if (!nominee) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Nominee with ID "${nomineeId}" not found`,
        });
      }

      await tx.customerNominee.update({
        where: { id: nomineeId },
        data: { deletedAt: new Date() },
      });

      return { success: true, id: nomineeId };
    });
  }

  async addCoBuyer(
    companyId: string,
    customerId: string,
    dto: CreateCustomerCoBuyerDto,
    context?: CustomerScopeContext,
  ): Promise<CustomerCoBuyerResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeCustomer(tx, companyId, customerId, context);

      const coBuyer = await tx.customerCoBuyer.create({
        data: buildCoBuyerCreateData(companyId, customerId, dto, this.fieldCrypto),
      });

      return mapCustomerCoBuyer(coBuyer, this.fieldCrypto, false);
    });
  }

  async deleteCoBuyer(
    companyId: string,
    customerId: string,
    coBuyerId: string,
    context?: CustomerScopeContext,
  ): Promise<{ success: boolean; id: string }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      await findAndScopeCustomer(tx, companyId, customerId, context);

      const coBuyer = await tx.customerCoBuyer.findFirst({
        where: { id: coBuyerId, primaryCustomerId: customerId, companyId, deletedAt: null },
      });
      if (!coBuyer) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Co-buyer with ID "${coBuyerId}" not found`,
        });
      }

      await tx.customerCoBuyer.update({
        where: { id: coBuyerId },
        data: { deletedAt: new Date() },
      });

      return { success: true, id: coBuyerId };
    });
  }
}
