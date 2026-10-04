import type { Prisma } from '@prisma/client';
import type { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import type { QueryCustomersDto } from './dto/query-customers.dto.js';

export function encryptCustomerPii(
  fieldCrypto: FieldCryptoService,
  value?: string | null,
): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return fieldCrypto.encrypt(trimmed);
}

export function computeCustomerBlindIndex(
  fieldCrypto: FieldCryptoService,
  value: string | null | undefined,
  companyId: string,
): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return fieldCrypto.blindIndex(trimmed, companyId);
}

export function maskPii(value: string | null | undefined, visibleTrailing = 4): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length <= visibleTrailing) {
    return '*'.repeat(trimmed.length);
  }
  const maskedLength = trimmed.length - visibleTrailing;
  const suffix = trimmed.slice(-visibleTrailing);
  return `${'*'.repeat(Math.min(maskedLength, 6))}${suffix}`;
}

export function decryptOrMaskPii(
  fieldCrypto: FieldCryptoService,
  encryptedValue: string | null | undefined,
  hasPiiPermission: boolean,
): string | null {
  if (!encryptedValue) {
    return null;
  }
  try {
    const decrypted = fieldCrypto.decrypt(encryptedValue);
    if (hasPiiPermission) {
      return decrypted;
    }
    return maskPii(decrypted);
  } catch {
    return '********';
  }
}

export function buildCustomerBlindIndexFilters(
  fieldCrypto: FieldCryptoService,
  query: QueryCustomersDto,
  companyId: string,
): Prisma.CustomerWhereInput[] {
  const filters: Prisma.CustomerWhereInput[] = [];

  if (query.nid) {
    const bidx = computeCustomerBlindIndex(fieldCrypto, query.nid, companyId);
    if (bidx) filters.push({ nidBidx: bidx });
  }

  if (query.passport) {
    const bidx = computeCustomerBlindIndex(fieldCrypto, query.passport, companyId);
    if (bidx) filters.push({ passportBidx: bidx });
  }

  if (query.tin) {
    const bidx = computeCustomerBlindIndex(fieldCrypto, query.tin, companyId);
    if (bidx) filters.push({ tinBidx: bidx });
  }

  if (query.bankAccount) {
    const bidx = computeCustomerBlindIndex(fieldCrypto, query.bankAccount, companyId);
    if (bidx) filters.push({ bankAccountBidx: bidx });
  }

  return filters;
}
