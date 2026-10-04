import { BadRequestException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { CreateJournalLineDto } from './dto/create-journal.dto.js';

export interface ValidatedBalance {
  totalDebit: bigint;
  totalCredit: bigint;
  parsedLines: Array<{
    lineNumber: number;
    accountId: string;
    debitPaisa: bigint;
    creditPaisa: bigint;
    description?: string;
    partyType?: string;
    partyId?: string;
    costCenter?: string;
    projectId?: string;
  }>;
}

export function validateJournalBalance(lines: CreateJournalLineDto[]): ValidatedBalance {
  let totalDebit = 0n;
  let totalCredit = 0n;

  const parsedLines = lines.map((line, index) => {
    const debit = BigInt(line.debitPaisa || '0');
    const credit = BigInt(line.creditPaisa || '0');

    if (debit < 0n || credit < 0n) {
      throw new BadRequestException(
        `Line ${index + 1}: Debit and credit amounts cannot be negative`,
      );
    }

    if (debit === 0n && credit === 0n) {
      throw new BadRequestException(
        `Line ${index + 1}: Either debit or credit amount must be greater than zero`,
      );
    }

    if (debit > 0n && credit > 0n) {
      throw new BadRequestException(
        `Line ${index + 1}: A line cannot have both debit and credit amounts`,
      );
    }

    totalDebit += debit;
    totalCredit += credit;

    return {
      lineNumber: index + 1,
      accountId: line.accountId,
      debitPaisa: debit,
      creditPaisa: credit,
      description: line.description,
      partyType: line.partyType,
      partyId: line.partyId,
      costCenter: line.costCenter,
      projectId: line.projectId,
    };
  });

  if (totalDebit !== totalCredit || totalDebit === 0n) {
    throw new AppException(
      ERROR_CODES.JOURNAL_UNBALANCED,
      `Journal entries are unbalanced: total debits (${totalDebit}) must equal total credits (${totalCredit})`,
      {
        totalDebit: totalDebit.toString(),
        totalCredit: totalCredit.toString(),
        difference: (totalDebit - totalCredit).toString(),
      },
    );
  }

  return { totalDebit, totalCredit, parsedLines };
}

export async function validateAccounts(
  companyId: string,
  accountIds: string[],
  tx: TenantPrisma,
): Promise<void> {
  const uniqueIds = Array.from(new Set(accountIds));
  const accounts = await tx.account.findMany({
    where: {
      companyId,
      id: { in: uniqueIds },
    },
  });

  if (accounts.length !== uniqueIds.length) {
    const foundIds = new Set(accounts.map((a) => a.id));
    const missing = uniqueIds.filter((id) => !foundIds.has(id));
    throw new BadRequestException(`Account(s) not found in company: ${missing.join(', ')}`);
  }

  for (const acc of accounts) {
    if (!acc.isActive) {
      throw new BadRequestException(
        `Account "${acc.code} - ${acc.name}" is deactivated and cannot receive postings`,
      );
    }
    if (acc.isGroup) {
      throw new BadRequestException(
        `Account "${acc.code} - ${acc.name}" is a group header and cannot receive direct postings`,
      );
    }
  }
}
