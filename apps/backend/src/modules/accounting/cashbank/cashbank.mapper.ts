import { BankAccountResponseDto } from './dto/bank-account.dto.js';

export interface RawBankAccount {
  id: string;
  companyId: string;
  accountType: string;
  name: string;
  accountNumberMasked: string | null;
  bankId: string | null;
  branchId: string | null;
  routingNumber: string | null;
  swiftCode: string | null;
  currency: string;
  coaAccountId: string;
  coaAccountCode: string;
  initialBalancePaisa: bigint;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  bank?: { id: string; name: string; code: string; swiftCode: string | null } | null;
  branch?: {
    id: string;
    name: string;
    routingNumber: string;
    district: string | null;
  } | null;
}

export function mapBankAccountToDto(
  acc: RawBankAccount,
  balancePaisa: bigint,
): BankAccountResponseDto {
  return {
    id: acc.id,
    companyId: acc.companyId,
    accountType: acc.accountType,
    name: acc.name,
    accountNumberMasked: acc.accountNumberMasked,
    bankId: acc.bankId,
    bank: acc.bank
      ? {
          id: acc.bank.id,
          name: acc.bank.name,
          code: acc.bank.code,
          swiftCode: acc.bank.swiftCode,
        }
      : null,
    branchId: acc.branchId,
    branch: acc.branch
      ? {
          id: acc.branch.id,
          name: acc.branch.name,
          routingNumber: acc.branch.routingNumber,
          district: acc.branch.district,
        }
      : null,
    routingNumber: acc.routingNumber,
    swiftCode: acc.swiftCode,
    currency: acc.currency,
    coaAccountId: acc.coaAccountId,
    coaAccountCode: acc.coaAccountCode,
    initialBalancePaisa: acc.initialBalancePaisa.toString(),
    currentBalancePaisa: balancePaisa.toString(),
    isActive: acc.isActive,
    createdAt: acc.createdAt.toISOString(),
    updatedAt: acc.updatedAt.toISOString(),
  };
}
