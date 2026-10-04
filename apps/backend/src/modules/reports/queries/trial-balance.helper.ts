import { Account } from '@prisma/client';
import { formatMoney, type AccountType } from '@exzaestate/shared';
import { TrialBalanceReportDto, TrialBalanceRowDto } from '../dto/trial-balance-response.dto.js';

export interface AccountBalanceMaps {
  openingDebits: Map<string, bigint>;
  openingCredits: Map<string, bigint>;
  periodDebits: Map<string, bigint>;
  periodCredits: Map<string, bigint>;
}

export function aggregateJournalLines(
  lines: {
    accountId: string;
    debitPaisa: bigint;
    creditPaisa: bigint;
    journal: { postingDate: Date };
  }[],
  startDate: Date,
): AccountBalanceMaps {
  const openingDebits = new Map<string, bigint>();
  const openingCredits = new Map<string, bigint>();
  const periodDebits = new Map<string, bigint>();
  const periodCredits = new Map<string, bigint>();

  for (const line of lines) {
    const accId = line.accountId;
    const isOpening = line.journal.postingDate < startDate;
    if (isOpening) {
      openingDebits.set(accId, (openingDebits.get(accId) ?? 0n) + line.debitPaisa);
      openingCredits.set(accId, (openingCredits.get(accId) ?? 0n) + line.creditPaisa);
    } else {
      periodDebits.set(accId, (periodDebits.get(accId) ?? 0n) + line.debitPaisa);
      periodCredits.set(accId, (periodCredits.get(accId) ?? 0n) + line.creditPaisa);
    }
  }

  return { openingDebits, openingCredits, periodDebits, periodCredits };
}

export function buildTrialBalanceRow(
  account: Account,
  balances: AccountBalanceMaps,
): { row: TrialBalanceRowDto; isZero: boolean } {
  const oDeb = balances.openingDebits.get(account.id) ?? 0n;
  const oCred = balances.openingCredits.get(account.id) ?? 0n;
  const pDeb = balances.periodDebits.get(account.id) ?? 0n;
  const pCred = balances.periodCredits.get(account.id) ?? 0n;

  const cDeb = oDeb + pDeb;
  const cCred = oCred + pCred;

  let netDeb = 0n;
  let netCred = 0n;
  if (cDeb > cCred) {
    netDeb = cDeb - cCred;
  } else if (cCred > cDeb) {
    netCred = cCred - cDeb;
  }

  const isZero = oDeb === 0n && oCred === 0n && pDeb === 0n && pCred === 0n;

  const row: TrialBalanceRowDto = {
    accountId: account.id,
    accountCode: account.code,
    accountName: account.name,
    accountType: account.type as AccountType,
    openingDebitPaisa: oDeb.toString(),
    openingCreditPaisa: oCred.toString(),
    periodDebitPaisa: pDeb.toString(),
    periodCreditPaisa: pCred.toString(),
    closingDebitPaisa: cDeb.toString(),
    closingCreditPaisa: cCred.toString(),
    netDebitPaisa: netDeb.toString(),
    netCreditPaisa: netCred.toString(),
    netDebitFormatted: formatMoney(netDeb),
    netCreditFormatted: formatMoney(netCred),
  };

  return { row, isZero };
}

export function processTrialBalanceAccounts(
  accounts: Account[],
  balances: AccountBalanceMaps,
  includeZero: boolean,
): {
  rows: TrialBalanceRowDto[];
  totalOpeningDebit: bigint;
  totalOpeningCredit: bigint;
  totalPeriodDebit: bigint;
  totalPeriodCredit: bigint;
  totalClosingDebit: bigint;
  totalClosingCredit: bigint;
  totalNetDebit: bigint;
  totalNetCredit: bigint;
} {
  let totalOpeningDebit = 0n;
  let totalOpeningCredit = 0n;
  let totalPeriodDebit = 0n;
  let totalPeriodCredit = 0n;
  let totalClosingDebit = 0n;
  let totalClosingCredit = 0n;
  let totalNetDebit = 0n;
  let totalNetCredit = 0n;

  const rows: TrialBalanceRowDto[] = [];

  for (const account of accounts) {
    const { row, isZero } = buildTrialBalanceRow(account, balances);
    if (isZero && !includeZero) {
      continue;
    }

    totalOpeningDebit += BigInt(row.openingDebitPaisa);
    totalOpeningCredit += BigInt(row.openingCreditPaisa);
    totalPeriodDebit += BigInt(row.periodDebitPaisa);
    totalPeriodCredit += BigInt(row.periodCreditPaisa);
    totalClosingDebit += BigInt(row.closingDebitPaisa);
    totalClosingCredit += BigInt(row.closingCreditPaisa);
    totalNetDebit += BigInt(row.netDebitPaisa);
    totalNetCredit += BigInt(row.netCreditPaisa);

    rows.push(row);
  }

  return {
    rows,
    totalOpeningDebit,
    totalOpeningCredit,
    totalPeriodDebit,
    totalPeriodCredit,
    totalClosingDebit,
    totalClosingCredit,
    totalNetDebit,
    totalNetCredit,
  };
}

export function buildTrialBalanceReport(
  startDateStr: string,
  endDateStr: string,
  data: ReturnType<typeof processTrialBalanceAccounts>,
): TrialBalanceReportDto {
  const isBalanced = data.totalNetDebit === data.totalNetCredit;
  const difference =
    data.totalNetDebit > data.totalNetCredit
      ? data.totalNetDebit - data.totalNetCredit
      : data.totalNetCredit - data.totalNetDebit;

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    rows: data.rows,
    totalOpeningDebitPaisa: data.totalOpeningDebit.toString(),
    totalOpeningCreditPaisa: data.totalOpeningCredit.toString(),
    totalPeriodDebitPaisa: data.totalPeriodDebit.toString(),
    totalPeriodCreditPaisa: data.totalPeriodCredit.toString(),
    totalClosingDebitPaisa: data.totalClosingDebit.toString(),
    totalClosingCreditPaisa: data.totalClosingCredit.toString(),
    totalDebitPaisa: data.totalNetDebit.toString(),
    totalCreditPaisa: data.totalNetCredit.toString(),
    totalDebitFormatted: formatMoney(data.totalNetDebit),
    totalCreditFormatted: formatMoney(data.totalNetCredit),
    isBalanced,
    differencePaisa: difference.toString(),
  };
}
