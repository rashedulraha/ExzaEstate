import { Account } from '@prisma/client';
import { ACCOUNT_TYPES, formatMoney } from '@exzaestate/shared';
import {
  IncomeStatementItemDto,
  IncomeStatementReportDto,
} from '../dto/income-statement-response.dto.js';

export interface IncomeStatementBuckets {
  revenues: IncomeStatementItemDto[];
  costOfSales: IncomeStatementItemDto[];
  operatingExpenses: IncomeStatementItemDto[];
  totalRevenue: bigint;
  totalCostOfSales: bigint;
  totalOperatingExpenses: bigint;
}

export function createEmptyIncomeBuckets(): IncomeStatementBuckets {
  return {
    revenues: [],
    costOfSales: [],
    operatingExpenses: [],
    totalRevenue: 0n,
    totalCostOfSales: 0n,
    totalOperatingExpenses: 0n,
  };
}

export function categorizeIncomeAccount(
  acc: Account,
  deb: bigint,
  cred: bigint,
  includeZero: boolean,
  buckets: IncomeStatementBuckets,
): void {
  if (acc.type === ACCOUNT_TYPES.INCOME || acc.type === 'REVENUE') {
    const bal = cred - deb;
    if (bal === 0n && !includeZero) return;
    buckets.revenues.push({
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      amountPaisa: bal.toString(),
      amountFormatted: formatMoney(bal),
    });
    buckets.totalRevenue += bal;
  } else if (acc.type === ACCOUNT_TYPES.EXPENSE) {
    const bal = deb - cred;
    if (bal === 0n && !includeZero) return;
    const item = {
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      amountPaisa: bal.toString(),
      amountFormatted: formatMoney(bal),
    };
    if (acc.code === '5100') {
      buckets.costOfSales.push(item);
      buckets.totalCostOfSales += bal;
    } else {
      buckets.operatingExpenses.push(item);
      buckets.totalOperatingExpenses += bal;
    }
  }
}

export function processIncomeAccounts(
  accounts: Account[],
  lines: { accountId: string; debitPaisa: bigint; creditPaisa: bigint }[],
  includeZero: boolean,
): IncomeStatementBuckets {
  const debits = new Map<string, bigint>();
  const credits = new Map<string, bigint>();
  for (const line of lines) {
    debits.set(line.accountId, (debits.get(line.accountId) ?? 0n) + line.debitPaisa);
    credits.set(line.accountId, (credits.get(line.accountId) ?? 0n) + line.creditPaisa);
  }

  const buckets = createEmptyIncomeBuckets();
  for (const acc of accounts) {
    const deb = debits.get(acc.id) ?? 0n;
    const cred = credits.get(acc.id) ?? 0n;
    categorizeIncomeAccount(acc, deb, cred, includeZero, buckets);
  }

  return buckets;
}

export function buildIncomeStatementReport(
  startDateStr: string,
  endDateStr: string,
  buckets: IncomeStatementBuckets,
): IncomeStatementReportDto {
  const grossProfit = buckets.totalRevenue - buckets.totalCostOfSales;
  const netProfit = grossProfit - buckets.totalOperatingExpenses;

  const grossProfitMarginPct =
    buckets.totalRevenue > 0n
      ? Math.round((Number(grossProfit) / Number(buckets.totalRevenue)) * 10000) / 100
      : 0;

  const netProfitMarginPct =
    buckets.totalRevenue > 0n
      ? Math.round((Number(netProfit) / Number(buckets.totalRevenue)) * 10000) / 100
      : 0;

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    revenues: buckets.revenues,
    totalRevenuePaisa: buckets.totalRevenue.toString(),
    totalRevenueFormatted: formatMoney(buckets.totalRevenue),
    costOfSales: buckets.costOfSales,
    totalCostOfSalesPaisa: buckets.totalCostOfSales.toString(),
    totalCostOfSalesFormatted: formatMoney(buckets.totalCostOfSales),
    grossProfitPaisa: grossProfit.toString(),
    grossProfitFormatted: formatMoney(grossProfit),
    grossProfitMarginPct,
    operatingExpenses: buckets.operatingExpenses,
    totalOperatingExpensesPaisa: buckets.totalOperatingExpenses.toString(),
    totalOperatingExpensesFormatted: formatMoney(buckets.totalOperatingExpenses),
    netProfitPaisa: netProfit.toString(),
    netProfitFormatted: formatMoney(netProfit),
    netProfitMarginPct,
  };
}
