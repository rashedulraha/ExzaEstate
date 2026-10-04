import type { Prisma } from '@prisma/client';
import type { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import { computeCustomerBlindIndex, encryptCustomerPii } from './customer-crypto.helper.js';
import type { ConvertLeadDto } from './dto/index.js';

export interface LeadConversionLeadRecord {
  id: string;
  leadNumber: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  branchId: string | null;
  assignedToId: string | null;
}

export function cleanText(val?: string | null): string | null {
  return val ? val.trim() : null;
}

export function parseDob(dob?: string | null): Date | null {
  return dob ? new Date(`${dob}T00:00:00.000Z`) : null;
}

export function buildLeadPiiData(
  companyId: string,
  dto: ConvertLeadDto,
  fieldCrypto: FieldCryptoService,
) {
  return {
    nidEncrypted: encryptCustomerPii(fieldCrypto, dto.nid),
    nidBidx: computeCustomerBlindIndex(fieldCrypto, dto.nid, companyId),
    passportEncrypted: encryptCustomerPii(fieldCrypto, dto.passport),
    passportBidx: computeCustomerBlindIndex(fieldCrypto, dto.passport, companyId),
    tinEncrypted: encryptCustomerPii(fieldCrypto, dto.tin),
    tinBidx: computeCustomerBlindIndex(fieldCrypto, dto.tin, companyId),
    bankAccountEncrypted: encryptCustomerPii(fieldCrypto, dto.bankAccountNumber),
    bankAccountBidx: computeCustomerBlindIndex(fieldCrypto, dto.bankAccountNumber, companyId),
  };
}

export function buildLeadConversionCustomerData(
  companyId: string,
  customerNumber: string,
  lead: LeadConversionLeadRecord,
  dto: ConvertLeadDto,
  fieldCrypto: FieldCryptoService,
  userId?: string,
): Prisma.CustomerUncheckedCreateInput {
  const pii = buildLeadPiiData(companyId, dto, fieldCrypto);
  const name = cleanText(dto.name) ?? lead.name;
  const email = cleanText(dto.email) ?? cleanText(lead.email);

  return {
    companyId,
    customerNumber,
    customerType: dto.customerType ?? 'INDIVIDUAL',
    name,
    phone: lead.phone,
    email,
    fatherOrSpouseName: cleanText(dto.fatherOrSpouseName),
    motherName: cleanText(dto.motherName),
    dateOfBirth: parseDob(dto.dateOfBirth),
    occupation: cleanText(dto.occupation),
    nationality: cleanText(dto.nationality) ?? 'Bangladeshi',
    isNrb: dto.isNrb ?? false,
    photoUrl: cleanText(dto.photoUrl),
    ...pii,
    bankName: cleanText(dto.bankName),
    bankBranch: cleanText(dto.bankBranch),
    bankRoutingNumber: cleanText(dto.bankRoutingNumber),
    leadId: lead.id,
    branchId: lead.branchId,
    assignedToId: lead.assignedToId,
    createdById: userId ?? null,
    updatedById: userId ?? null,
  };
}
