import type { Prisma } from '@prisma/client';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import { computeCustomerBlindIndex, encryptCustomerPii } from './customer-crypto.helper.js';
import type { CreateCustomerContactDto } from './dto/customer-contact.dto.js';
import type { CreateCustomerAddressDto } from './dto/customer-address.dto.js';
import type { CreateCustomerNomineeDto } from './dto/customer-nominee.dto.js';
import type { CreateCustomerCoBuyerDto } from './dto/customer-co-buyer.dto.js';

function cleanText(val?: string | null): string | null {
  return val ? val.trim() : null;
}

export function buildNomineeCreateData(
  companyId: string,
  customerId: string,
  dto: CreateCustomerNomineeDto,
  fieldCrypto: FieldCryptoService,
): Prisma.CustomerNomineeUncheckedCreateInput {
  const nidEncrypted = encryptCustomerPii(fieldCrypto, dto.nid);
  const nidBidx = computeCustomerBlindIndex(fieldCrypto, dto.nid, companyId);

  return {
    companyId,
    customerId,
    name: dto.name.trim(),
    relationship: dto.relationship.trim(),
    phone: cleanText(dto.phone),
    email: cleanText(dto.email),
    nidEncrypted,
    nidBidx,
    address: cleanText(dto.address),
    photoUrl: cleanText(dto.photoUrl),
    sharePercentage: dto.sharePercentage ?? 100,
    isPowerOfAttorney: dto.isPowerOfAttorney ?? false,
    poaDocumentNumber: cleanText(dto.poaDocumentNumber),
  };
}

export function buildCoBuyerCreateData(
  companyId: string,
  customerId: string,
  dto: CreateCustomerCoBuyerDto,
  fieldCrypto: FieldCryptoService,
): Prisma.CustomerCoBuyerUncheckedCreateInput {
  const nidEncrypted = encryptCustomerPii(fieldCrypto, dto.nid);
  const nidBidx = computeCustomerBlindIndex(fieldCrypto, dto.nid, companyId);

  return {
    companyId,
    primaryCustomerId: customerId,
    coBuyerCustomerId: dto.coBuyerCustomerId ?? null,
    name: dto.name.trim(),
    relationship: cleanText(dto.relationship),
    phone: dto.phone.trim(),
    email: cleanText(dto.email),
    nidEncrypted,
    nidBidx,
    sharePercentage: dto.sharePercentage ?? 50,
  };
}

export async function createInitialContacts(
  tx: TenantPrisma,
  companyId: string,
  customerId: string,
  contacts?: CreateCustomerContactDto[],
): Promise<void> {
  if (!contacts || contacts.length === 0) return;
  await tx.customerContact.createMany({
    data: contacts.map((c) => ({
      companyId,
      customerId,
      name: c.name.trim(),
      relationship: c.relationship?.trim() ?? null,
      phone: c.phone.trim(),
      email: c.email?.trim() ?? null,
      isPrimary: c.isPrimary ?? false,
    })),
  });
}

export async function createInitialAddresses(
  tx: TenantPrisma,
  companyId: string,
  customerId: string,
  addresses?: CreateCustomerAddressDto[],
): Promise<void> {
  if (!addresses || addresses.length === 0) return;
  await tx.customerAddress.createMany({
    data: addresses.map((a) => ({
      companyId,
      customerId,
      type: a.type,
      addressLine1: a.addressLine1.trim(),
      addressLine2: a.addressLine2?.trim() ?? null,
      city: a.city.trim(),
      division: a.division?.trim() ?? null,
      postalCode: a.postalCode?.trim() ?? null,
      country: a.country?.trim() ?? 'Bangladesh',
      isPrimary: a.isPrimary ?? false,
    })),
  });
}

export async function createInitialNominees(
  tx: TenantPrisma,
  companyId: string,
  customerId: string,
  nominees?: CreateCustomerNomineeDto[],
  fieldCrypto?: FieldCryptoService,
): Promise<void> {
  if (!nominees || nominees.length === 0 || !fieldCrypto) return;
  for (const n of nominees) {
    await tx.customerNominee.create({
      data: buildNomineeCreateData(companyId, customerId, n, fieldCrypto),
    });
  }
}

export async function createInitialCoBuyers(
  tx: TenantPrisma,
  companyId: string,
  customerId: string,
  coBuyers?: CreateCustomerCoBuyerDto[],
  fieldCrypto?: FieldCryptoService,
): Promise<void> {
  if (!coBuyers || coBuyers.length === 0 || !fieldCrypto) return;
  for (const cb of coBuyers) {
    await tx.customerCoBuyer.create({
      data: buildCoBuyerCreateData(companyId, customerId, cb, fieldCrypto),
    });
  }
}
