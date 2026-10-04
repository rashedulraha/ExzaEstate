import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@exzaestate/shared';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { SequenceService } from '../../platform/sequence/sequence.service.js';
import type { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import { computeCustomerBlindIndex, encryptCustomerPii } from './customer-crypto.helper.js';
import { enforceCustomerScope, type CustomerScopeContext } from './customer-scope.helper.js';
import {
  createInitialContacts,
  createInitialAddresses,
  createInitialNominees,
  createInitialCoBuyers,
} from './customer-relation.helper.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';
import type { UpdateCustomerDto } from './dto/update-customer.dto.js';

export const CUSTOMER_DETAIL_INCLUDE = {
  contacts: { where: { deletedAt: null } },
  addresses: { where: { deletedAt: null } },
  nominees: { where: { deletedAt: null } },
  coBuyers: { where: { deletedAt: null } },
  followUps: {
    where: { deletedAt: null },
    orderBy: { dueDate: 'asc' as const },
    take: 10,
  },
} as const;

export async function generateCustomerNumber(
  tx: TenantPrisma,
  sequenceService: SequenceService,
): Promise<string> {
  const currentYear = new Date().getFullYear().toString();
  const seqVal = await sequenceService.next(tx, {
    type: 'CUSTOMER',
    fiscalYear: currentYear,
  });
  return sequenceService.format({
    prefix: 'CUST',
    fiscalYear: currentYear,
    value: seqVal,
    padding: 6,
  });
}

export async function findAndScopeCustomer(
  tx: TenantPrisma,
  companyId: string,
  id: string,
  context?: CustomerScopeContext,
) {
  const customer = await tx.customer.findFirst({
    where: {
      id,
      companyId,
      deletedAt: null,
    },
    include: CUSTOMER_DETAIL_INCLUDE,
  });

  if (!customer) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Customer with ID "${id}" was not found`,
    });
  }

  if (context) {
    enforceCustomerScope(customer, context);
  }

  return customer;
}

export async function assertNoDuplicateCustomerPhone(
  tx: TenantPrisma,
  companyId: string,
  phone: string,
  excludeId?: string,
): Promise<void> {
  const existing = await tx.customer.findFirst({
    where: {
      companyId,
      phone,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, customerNumber: true, name: true, phone: true },
  });

  if (existing) {
    throw new ConflictException({
      code: ERROR_CODES.CONFLICT,
      message: `A customer with phone "${phone}" already exists (${existing.customerNumber} - ${existing.name})`,
      details: {
        existingCustomerId: existing.id,
        customerNumber: existing.customerNumber,
        name: existing.name,
      },
    });
  }
}

export function buildCustomerPiiCreateData(
  companyId: string,
  dto: CreateCustomerDto,
  fieldCrypto: FieldCryptoService,
) {
  return {
    nidEncrypted: encryptCustomerPii(fieldCrypto, dto.nid),
    nidBidx: computeCustomerBlindIndex(fieldCrypto, dto.nid, companyId),
    passportEncrypted: encryptCustomerPii(fieldCrypto, dto.passport),
    passportBidx: computeCustomerBlindIndex(fieldCrypto, dto.passport, companyId),
    tinEncrypted: encryptCustomerPii(fieldCrypto, dto.tin),
    tinBidx: computeCustomerBlindIndex(fieldCrypto, dto.tin, companyId),
    bankAccountEncrypted: encryptCustomerPii(fieldCrypto, dto.bankAccount),
    bankAccountBidx: computeCustomerBlindIndex(fieldCrypto, dto.bankAccount, companyId),
  };
}

function parseDob(dob?: string | null): Date | null {
  return dob ? new Date(`${dob}T00:00:00.000Z`) : null;
}

function cleanVal(val?: string | null): string | null {
  return val ? val.trim() : null;
}

function buildCustomerIdentityData(dto: CreateCustomerDto) {
  return {
    customerType: dto.customerType ?? 'INDIVIDUAL',
    name: dto.name.trim(),
    fatherOrSpouseName: cleanVal(dto.fatherOrSpouseName),
    motherName: cleanVal(dto.motherName),
    dateOfBirth: parseDob(dto.dateOfBirth),
    occupation: cleanVal(dto.occupation),
    nationality: dto.nationality?.trim() ?? 'Bangladeshi',
    isNrb: dto.isNrb ?? false,
    phone: dto.phone.trim(),
    email: cleanVal(dto.email),
    photoUrl: cleanVal(dto.photoUrl),
  };
}

function buildCustomerBankingData(dto: CreateCustomerDto) {
  return {
    bankName: cleanVal(dto.bankName),
    bankBranch: cleanVal(dto.bankBranch),
    bankRoutingNumber: cleanVal(dto.bankRoutingNumber),
    originalCurrency: cleanVal(dto.originalCurrency),
    remittanceReference: cleanVal(dto.remittanceReference),
  };
}

export function buildCustomerCreateData(
  companyId: string,
  customerNumber: string,
  dto: CreateCustomerDto,
  fieldCrypto: FieldCryptoService,
  userId?: string,
): Prisma.CustomerUncheckedCreateInput {
  const pii = buildCustomerPiiCreateData(companyId, dto, fieldCrypto);
  const identity = buildCustomerIdentityData(dto);
  const banking = buildCustomerBankingData(dto);

  return {
    companyId,
    customerNumber,
    ...identity,
    ...pii,
    ...banking,
    leadId: dto.leadId ?? null,
    branchId: dto.branchId ?? null,
    assignedToId: dto.assignedToId ?? userId ?? null,
    createdById: userId ?? null,
  };
}

function applyCustomerIdentityUpdates(data: Prisma.CustomerUpdateInput, dto: UpdateCustomerDto) {
  if (dto.customerType !== undefined) data.customerType = dto.customerType;
  if (dto.name !== undefined) data.name = dto.name.trim();
  if (dto.fatherOrSpouseName !== undefined)
    data.fatherOrSpouseName = cleanVal(dto.fatherOrSpouseName);
  if (dto.motherName !== undefined) data.motherName = cleanVal(dto.motherName);
  if (dto.dateOfBirth !== undefined) data.dateOfBirth = parseDob(dto.dateOfBirth);
}

function applyCustomerContactUpdates(data: Prisma.CustomerUpdateInput, dto: UpdateCustomerDto) {
  if (dto.occupation !== undefined) data.occupation = cleanVal(dto.occupation);
  if (dto.nationality !== undefined) data.nationality = dto.nationality.trim();
  if (dto.isNrb !== undefined) data.isNrb = dto.isNrb;
  if (dto.phone !== undefined) data.phone = dto.phone.trim();
  if (dto.email !== undefined) data.email = cleanVal(dto.email);
  if (dto.photoUrl !== undefined) data.photoUrl = cleanVal(dto.photoUrl);
}

function applyCustomerPiiUpdates(
  data: Prisma.CustomerUpdateInput,
  dto: UpdateCustomerDto,
  fieldCrypto: FieldCryptoService,
  companyId: string,
) {
  if (dto.nid !== undefined) {
    data.nidEncrypted = encryptCustomerPii(fieldCrypto, dto.nid);
    data.nidBidx = computeCustomerBlindIndex(fieldCrypto, dto.nid, companyId);
  }
  if (dto.passport !== undefined) {
    data.passportEncrypted = encryptCustomerPii(fieldCrypto, dto.passport);
    data.passportBidx = computeCustomerBlindIndex(fieldCrypto, dto.passport, companyId);
  }
  if (dto.tin !== undefined) {
    data.tinEncrypted = encryptCustomerPii(fieldCrypto, dto.tin);
    data.tinBidx = computeCustomerBlindIndex(fieldCrypto, dto.tin, companyId);
  }
  if (dto.bankAccount !== undefined) {
    data.bankAccountEncrypted = encryptCustomerPii(fieldCrypto, dto.bankAccount);
    data.bankAccountBidx = computeCustomerBlindIndex(fieldCrypto, dto.bankAccount, companyId);
  }
}

function applyCustomerMetaUpdates(
  data: Prisma.CustomerUpdateInput,
  dto: UpdateCustomerDto,
  userId?: string,
) {
  if (dto.bankName !== undefined) data.bankName = cleanVal(dto.bankName);
  if (dto.bankBranch !== undefined) data.bankBranch = cleanVal(dto.bankBranch);
  if (dto.bankRoutingNumber !== undefined) data.bankRoutingNumber = cleanVal(dto.bankRoutingNumber);
  if (dto.originalCurrency !== undefined) data.originalCurrency = cleanVal(dto.originalCurrency);
  if (dto.remittanceReference !== undefined)
    data.remittanceReference = cleanVal(dto.remittanceReference);
  if (dto.branchId !== undefined) data.branchId = dto.branchId;
  if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;
  if (userId) data.updatedById = userId;
}

export function buildCustomerUpdateData(
  companyId: string,
  dto: UpdateCustomerDto,
  fieldCrypto: FieldCryptoService,
  userId?: string,
): Prisma.CustomerUpdateInput {
  const data: Prisma.CustomerUpdateInput = {};
  applyCustomerIdentityUpdates(data, dto);
  applyCustomerContactUpdates(data, dto);
  applyCustomerPiiUpdates(data, dto, fieldCrypto, companyId);
  applyCustomerMetaUpdates(data, dto, userId);
  return data;
}

export async function createInitialCustomerRelations(
  tx: TenantPrisma,
  companyId: string,
  customerId: string,
  dto: CreateCustomerDto,
  fieldCrypto: FieldCryptoService,
): Promise<void> {
  await createInitialContacts(tx, companyId, customerId, dto.contacts);
  await createInitialAddresses(tx, companyId, customerId, dto.addresses);
  await createInitialNominees(tx, companyId, customerId, dto.nominees, fieldCrypto);
  await createInitialCoBuyers(tx, companyId, customerId, dto.coBuyers, fieldCrypto);
}
