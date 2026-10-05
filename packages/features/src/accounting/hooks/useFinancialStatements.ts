import { useState } from 'react';
import {
  useReportsControllerGetTrialBalance,
  useReportsControllerGetBalanceSheet,
  useReportsControllerGetIncomeStatement,
  type TrialBalanceReportDto,
  type IncomeStatementReportDto,
  type BalanceSheetReportDto,
} from '@exzaestate/api-client';

function getInitialDate(provided?: string): string {
  if (provided) return provided;
  return new Date().toISOString().slice(0, 10);
}

function extractTrialBalanceData(data?: TrialBalanceReportDto) {
  if (!data) {
    return {
      rows: [],
      isBalanced: false,
      differencePaisa: '0',
      totalDebitPaisa: '0',
      totalCreditPaisa: '0',
    };
  }
  return {
    rows: data.rows,
    isBalanced: Boolean(data.isBalanced),
    differencePaisa: data.differencePaisa,
    totalDebitPaisa: data.totalDebitPaisa,
    totalCreditPaisa: data.totalCreditPaisa,
  };
}

export function useTrialBalance(initialAsOfDate?: string) {
  const [asOfDate, setAsOfDate] = useState<string>(getInitialDate(initialAsOfDate));
  const [costCenterId, setCostCenterId] = useState<string>('');

  const query = useReportsControllerGetTrialBalance({
    asOfDate: asOfDate || undefined,
    costCenterId: costCenterId || undefined,
  });

  const parsed = extractTrialBalanceData(query.data);

  return {
    asOfDate,
    setAsOfDate,
    costCenterId,
    setCostCenterId,
    data: query.data,
    rows: parsed.rows,
    isBalanced: parsed.isBalanced,
    differencePaisa: parsed.differencePaisa,
    totalDebitPaisa: parsed.totalDebitPaisa,
    totalCreditPaisa: parsed.totalCreditPaisa,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

function extractBalanceSheetData(data?: BalanceSheetReportDto) {
  if (!data) {
    return {
      isBalanced: true,
      differencePaisa: '0',
      totalLiabilitiesAndEquityPaisa: '0',
    };
  }
  return {
    isBalanced: Boolean(data.isBalanced),
    differencePaisa: data.differencePaisa,
    totalLiabilitiesAndEquityPaisa: data.totalLiabilitiesAndEquityPaisa,
  };
}

export function useBalanceSheet(initialAsOfDate?: string) {
  const [asOfDate, setAsOfDate] = useState<string>(getInitialDate(initialAsOfDate));

  const query = useReportsControllerGetBalanceSheet({
    asOfDate: asOfDate || undefined,
  });

  const parsed = extractBalanceSheetData(query.data);

  return {
    asOfDate,
    setAsOfDate,
    data: query.data,
    isBalanced: parsed.isBalanced,
    differencePaisa: parsed.differencePaisa,
    totalLiabilitiesAndEquityPaisa: parsed.totalLiabilitiesAndEquityPaisa,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

function extractIncomeStatementData(data?: IncomeStatementReportDto) {
  if (!data) {
    return {
      totalRevenuePaisa: '0',
      totalCostOfSalesPaisa: '0',
      grossProfitPaisa: '0',
      totalOperatingExpensesPaisa: '0',
      netProfitPaisa: '0',
    };
  }
  return {
    totalRevenuePaisa: data.totalRevenuePaisa,
    totalCostOfSalesPaisa: data.totalCostOfSalesPaisa,
    grossProfitPaisa: data.grossProfitPaisa,
    totalOperatingExpensesPaisa: data.totalOperatingExpensesPaisa,
    netProfitPaisa: data.netProfitPaisa,
  };
}

export function useIncomeStatement(initialStartDate?: string, initialEndDate?: string) {
  const today = getInitialDate();
  const firstDayOfYear = `${new Date().getFullYear()}-01-01`;

  const [startDate, setStartDate] = useState<string>(initialStartDate || firstDayOfYear);
  const [endDate, setEndDate] = useState<string>(initialEndDate || today);

  const query = useReportsControllerGetIncomeStatement({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const parsed = extractIncomeStatementData(query.data);

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    data: query.data,
    totalRevenuePaisa: parsed.totalRevenuePaisa,
    totalCostOfSalesPaisa: parsed.totalCostOfSalesPaisa,
    grossProfitPaisa: parsed.grossProfitPaisa,
    totalOperatingExpensesPaisa: parsed.totalOperatingExpensesPaisa,
    netProfitPaisa: parsed.netProfitPaisa,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
