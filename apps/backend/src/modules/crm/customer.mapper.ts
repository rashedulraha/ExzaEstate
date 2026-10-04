import type {
  Customer,
  CustomerAddress,
  CustomerCoBuyer,
  CustomerContact,
  CustomerNominee,
  Document,
  DocumentVersion,
} from '@prisma/client';
import type { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import { decryptOrMaskPii } from './customer-crypto.helper.js';
import { evaluateCustomerKyc } from './customer-kyc.helper.js';
import {
  CustomerAddressResponseDto,
  CustomerCoBuyerResponseDto,
  CustomerContactResponseDto,
  CustomerDetailResponseDto,
  CustomerDocumentItemDto,
  CustomerNomineeResponseDto,
  CustomerResponseDto,
} from './dto/index.js';
import { formatFollowUpResponse, type FollowUpWithRelations } from './follow-up.mapper.js';

export type CustomerWithRelations = Customer & {
  contacts?: CustomerContact[];
  addresses?: CustomerAddress[];
  nominees?: CustomerNominee[];
  coBuyers?: CustomerCoBuyer[];
  followUps?: FollowUpWithRelations[];
};

export type DocumentWithVersion = Document & {
  versions?: DocumentVersion[];
};

function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }
  return String(date).slice(0, 10);
}

export function mapCustomerResponse(
  customer: Customer,
  fieldCrypto: FieldCryptoService,
  hasPiiPermission: boolean,
): CustomerResponseDto {
  return {
    id: customer.id,
    companyId: customer.companyId,
    customerNumber: customer.customerNumber,
    customerType: customer.customerType,
    name: customer.name,
    fatherOrSpouseName: customer.fatherOrSpouseName,
    motherName: customer.motherName,
    dateOfBirth: formatDate(customer.dateOfBirth),
    occupation: customer.occupation,
    nationality: customer.nationality,
    isNrb: customer.isNrb,
    phone: customer.phone,
    email: customer.email,
    photoUrl: customer.photoUrl,

    nid: decryptOrMaskPii(fieldCrypto, customer.nidEncrypted, hasPiiPermission),
    passport: decryptOrMaskPii(fieldCrypto, customer.passportEncrypted, hasPiiPermission),
    tin: decryptOrMaskPii(fieldCrypto, customer.tinEncrypted, hasPiiPermission),
    bankAccount: decryptOrMaskPii(fieldCrypto, customer.bankAccountEncrypted, hasPiiPermission),
    bankName: customer.bankName,
    bankBranch: customer.bankBranch,
    bankRoutingNumber: customer.bankRoutingNumber,

    originalCurrency: customer.originalCurrency,
    remittanceReference: customer.remittanceReference,

    isKycCompleted: customer.isKycCompleted,
    kycCompletedAt: customer.kycCompletedAt ? customer.kycCompletedAt.toISOString() : null,
    kycCompletedById: customer.kycCompletedById,
    kycNotes: customer.kycNotes,

    leadId: customer.leadId,
    branchId: customer.branchId,
    assignedToId: customer.assignedToId,
    createdById: customer.createdById,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export function mapCustomerContact(contact: CustomerContact): CustomerContactResponseDto {
  return {
    id: contact.id,
    customerId: contact.customerId,
    name: contact.name,
    relationship: contact.relationship,
    phone: contact.phone,
    email: contact.email,
    isPrimary: contact.isPrimary,
    createdAt: contact.createdAt.toISOString(),
  };
}

export function mapCustomerAddress(address: CustomerAddress): CustomerAddressResponseDto {
  return {
    id: address.id,
    customerId: address.customerId,
    type: address.type,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    division: address.division,
    postalCode: address.postalCode,
    country: address.country,
    isPrimary: address.isPrimary,
    createdAt: address.createdAt.toISOString(),
  };
}

export function mapCustomerNominee(
  nominee: CustomerNominee,
  fieldCrypto: FieldCryptoService,
  hasPiiPermission: boolean,
): CustomerNomineeResponseDto {
  return {
    id: nominee.id,
    customerId: nominee.customerId,
    name: nominee.name,
    relationship: nominee.relationship,
    phone: nominee.phone,
    email: nominee.email,
    nid: decryptOrMaskPii(fieldCrypto, nominee.nidEncrypted, hasPiiPermission),
    address: nominee.address,
    photoUrl: nominee.photoUrl,
    sharePercentage: Number(nominee.sharePercentage),
    isPowerOfAttorney: nominee.isPowerOfAttorney,
    poaDocumentNumber: nominee.poaDocumentNumber,
    createdAt: nominee.createdAt.toISOString(),
  };
}

export function mapCustomerCoBuyer(
  coBuyer: CustomerCoBuyer,
  fieldCrypto: FieldCryptoService,
  hasPiiPermission: boolean,
): CustomerCoBuyerResponseDto {
  return {
    id: coBuyer.id,
    primaryCustomerId: coBuyer.primaryCustomerId,
    coBuyerCustomerId: coBuyer.coBuyerCustomerId,
    name: coBuyer.name,
    relationship: coBuyer.relationship,
    phone: coBuyer.phone,
    email: coBuyer.email,
    nid: decryptOrMaskPii(fieldCrypto, coBuyer.nidEncrypted, hasPiiPermission),
    sharePercentage: Number(coBuyer.sharePercentage),
    createdAt: coBuyer.createdAt.toISOString(),
  };
}

export function mapCustomerDocument(doc: DocumentWithVersion): CustomerDocumentItemDto {
  const latestVersion = doc.versions?.[0];
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    currentVersion: doc.currentVersion,
    fileName: latestVersion?.fileName ?? doc.title,
    mimeType: latestVersion?.mimeType ?? 'application/octet-stream',
    sizeBytes: latestVersion?.sizeBytes ? latestVersion.sizeBytes.toString() : '0',
    createdAt: doc.createdAt.toISOString(),
  };
}

export function mapCustomerDetailResponse(
  customer: CustomerWithRelations,
  fieldCrypto: FieldCryptoService,
  hasPiiPermission: boolean,
  documents: DocumentWithVersion[] = [],
  companyTimezone = 'Asia/Dhaka',
): CustomerDetailResponseDto {
  const base = mapCustomerResponse(customer, fieldCrypto, hasPiiPermission);
  const contacts = (customer.contacts ?? []).map(mapCustomerContact);
  const addresses = (customer.addresses ?? []).map(mapCustomerAddress);
  const nominees = (customer.nominees ?? []).map((n) =>
    mapCustomerNominee(n, fieldCrypto, hasPiiPermission),
  );
  const coBuyers = (customer.coBuyers ?? []).map((cb) =>
    mapCustomerCoBuyer(cb, fieldCrypto, hasPiiPermission),
  );
  const followUps = (customer.followUps ?? []).map((f) =>
    formatFollowUpResponse(f, companyTimezone),
  );
  const docs = documents.map(mapCustomerDocument);

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

  return {
    ...base,
    contacts,
    addresses,
    nominees,
    coBuyers,
    documents: docs,
    followUps,
    kycStatus: {
      isComplete: kycEval.isComplete,
      isVerified: customer.isKycCompleted,
      verifiedAt: customer.kycCompletedAt ? customer.kycCompletedAt.toISOString() : null,
      verifiedById: customer.kycCompletedById,
      notes: customer.kycNotes,
      missingRequirements: kycEval.missingRequirements,
    },
  };
}
