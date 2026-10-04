import { Account } from '@prisma/client';
import { ACCOUNT_TYPES, formatMoney } from '@exzaestate/shared';
import { BalanceSheetItemDto, BalanceSheetReportDto } from '../dto/balance-sheet-response.dto.js';

export interface BalanceSheetBuckets {
  currentAssets: BalanceSheetItemDto[];
  nonCurrentAssets: BalanceSheetItemDto[];
  currentLiabilities: BalanceSheetItemDto[];
  nonCurrentLiabilities: BalanceSheetItemDto[];
  equityItems: BalanceSheetItemDto[];
  totalCurrentAssets: bigint;
  totalNonCurrentAssets: bigint;
  totalCurrentLiabilities: bigint;
  totalNonCurrentLiabilities: bigint;
  totalEquityItems: bigint;
  totalRevenue: bigint;
  totalExpense: bigint;
}

export function createEmptyBuckets(): BalanceSheetBuckets {
  return {
    currentAssets: [],
    nonCurrentAssets: [],
    currentLiabilities: [],
    nonCurrentLiabilities: [],
    equityItems: [],
    totalCurrentAssets: 0n,
    totalNonCurrentAssets: 0n,
    totalCurrentLiabilities: 0n,
    totalNonCurrentLiabilities: 0n,
    totalEquityItems: 0n,
    totalRevenue: 0n,
    totalExpense: 0n,
  };
}

function categorizeAsset(
  acc: Account,
  deb: bigint,
  cred: bigint,
  includeZero: boolean,
  buckets: BalanceSheetBuckets,
): void {
  const bal = deb - cred;
  if (bal === 0n && !includeZero) return;
  const item = {
    accountId: acc.id,
    accountCode: acc.code,
    accountName: acc.name,
    balancePaisa: bal.toString(),
    balanceFormatted: formatMoney(bal),
  };
  if (acc.code < '1500') {
    buckets.currentAssets.push(item);
    buckets.totalCurrentAssets += bal;
  } else {
    buckets.nonCurrentAssets.push(item);
    buckets.totalNonCurrentAssets += bal;
  }
}

function categorizeLiability(
  acc: Account,
  deb: bigint,
  cred: bigint,
  includeZero: boolean,
  buckets: BalanceSheetBuckets,
): void {
  const bal = cred - deb;
  if (bal === 0n && !includeZero) return;
  const item = {
    accountId: acc.id,
    accountCode: acc.code,
    accountName: acc.name,
    balancePaisa: bal.toString(),
    balanceFormatted: formatMoney(bal),
  };
  if (acc.code < '2700') {
    buckets.currentLiabilities.push(item);
    buckets.totalCurrentLiabilities += bal;
  } else {
    buckets.nonCurrentLiabilities.push(item);
    buckets.totalNonCurrentLiabilities += bal;
  }
}

function categorizeEquityOrIncome(
  acc: Account,
  deb: bigint,
  cred: bigint,
  includeZero: boolean,
  buckets: BalanceSheetBuckets,
): void {
  if (acc.type === ACCOUNT_TYPES.EQUITY) {
    const bal = cred - deb;
    if (bal !== 0n || includeZero) {
      buckets.equityItems.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        balancePaisa: bal.toString(),
        balanceFormatted: formatMoney(bal),
      });
      buckets.totalEquityItems += bal;
    }
  } else if (acc.type === ACCOUNT_TYPES.INCOME || acc.type === 'REVENUE') {
    buckets.totalRevenue += cred - deb;
  } else if (acc.type === ACCOUNT_TYPES.EXPENSE) {
    buckets.totalExpense += deb - cred;
  }
}

export function categorizeAccount(
  acc: Account,
  deb: bigint,
  cred: bigint,
  includeZero: boolean,
  buckets: BalanceSheetBuckets,
): void {
  if (acc.type === ACCOUNT_TYPES.ASSET) {
    categorizeAsset(acc, deb, cred, includeZero, buckets);
  } else if (acc.type === ACCOUNT_TYPES.LIABILITY) {
    categorizeLiability(acc, deb, cred, includeZero, buckets);
  } else {
    categorizeEquityOrIncome(acc, deb, cred, includeZero, buckets);
  }
}

export function processBalanceSheetAccounts(
  accounts: Account[],
  lines: { accountId: string; debitPaisa: bigint; creditPaisa: bigint }[],
  includeZero: boolean,
): BalanceSheetBuckets {
  const debitTotals = new Map<string, bigint>();
  const creditTotals = new Map<string, bigint>();
  for (const line of lines) {
    debitTotals.set(line.accountId, (debitTotals.get(line.accountId) ?? 0n) + line.debitPaisa);
    creditTotals.set(line.accountId, (creditTotals.get(line.accountId) ?? 0n) + line.creditPaisa);
  }

  const buckets = createEmptyBuckets();
  for (const acc of accounts) {
    const deb = debitTotals.get(acc.id) ?? 0n;
    const cred = creditTotals.get(acc.id) ?? 0n;
    categorizeAccount(acc, deb, cred, includeZero, buckets);
  }

  return buckets;
}

export function buildBalanceSheetReport(
  asOfDateStr: string,
  buckets: BalanceSheetBuckets,
): BalanceSheetReportDto {
  const currentPeriodNetIncome = buckets.totalRevenue - buckets.totalExpense;
  const totalEquity = buckets.totalEquityItems + currentPeriodNetIncome;
  const totalAssets = buckets.totalCurrentAssets + buckets.totalNonCurrentAssets;
  const totalLiabilities = buckets.totalCurrentLiabilities + buckets.totalNonCurrentLiabilities;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const isBalanced = totalAssets === totalLiabilitiesAndEquity;
  const difference = totalAssets - totalLiabilitiesAndEquity;

  return {
    asOfDate: asOfDateStr,
    assets: {
      currentAssets: buckets.currentAssets,
      totalCurrentAssetsPaisa: buckets.totalCurrentAssets.toString(),
      totalCurrentAssetsFormatted: formatMoney(buckets.totalCurrentAssets),
      nonCurrentAssets: buckets.nonCurrentAssets,
      totalNonCurrentAssetsPaisa: buckets.totalNonCurrentAssets.toString(),
      totalNonCurrentAssetsFormatted: formatMoney(buckets.totalNonCurrentAssets),
      totalAssetsPaisa: totalAssets.toString(),
      totalAssetsFormatted: formatMoney(totalAssets),
    },
    liabilities: {
      currentLiabilities: buckets.currentLiabilities,
      totalCurrentLiabilitiesPaisa: buckets.totalCurrentLiabilities.toString(),
      totalCurrentLiabilitiesFormatted: formatMoney(buckets.totalCurrentLiabilities),
      nonCurrentLiabilities: buckets.nonCurrentLiabilities,
      totalNonCurrentLiabilitiesPaisa: buckets.totalNonCurrentLiabilities.toString(),
      totalNonCurrentLiabilitiesFormatted: formatMoney(buckets.totalNonCurrentLiabilities),
      totalLiabilitiesPaisa: totalLiabilities.toString(),
      totalLiabilitiesFormatted: formatMoney(totalLiabilities),
    },
    equity: {
      items: buckets.equityItems,
      currentPeriodNetIncomePaisa: currentPeriodNetIncome.toString(),
      currentPeriodNetIncomeFormatted: formatMoney(currentPeriodNetIncome),
      totalEquityPaisa: totalEquity.toString(),
      totalEquityFormatted: formatMoney(totalEquity),
    },
    totalLiabilitiesAndEquityPaisa: totalLiabilitiesAndEquity.toString(),
    totalLiabilitiesAndEquityFormatted: formatMoney(totalLiabilitiesAndEquity),
    isBalanced,
    differencePaisa: difference.toString(),
  };
}
