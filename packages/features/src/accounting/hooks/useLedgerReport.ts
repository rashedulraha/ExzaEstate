import { useState, useMemo } from 'react';
import { useLedgerControllerGetLedger } from '@exzaestate/api-client';
import type { LedgerEntryItem } from '../schemas/accounting.schema.js';

export interface LedgerFilters {
  accountId?: string;
  accountCode?: string;
  startDate?: string;
  endDate?: string;
  costCenterId?: string;
  projectId?: string;
}

interface RawLedgerLine {
  id?: string;
  postingDate?: string;
  date?: string;
  journalId?: string;
  journalNumber?: string;
  journalEntryCode?: string;
  accountCode?: string;
  accountName?: string;
  narration?: string;
  description?: string;
  debitPaisa?: string | number | bigint;
  creditPaisa?: string | number | bigint;
  runningBalancePaisa?: string | number | bigint;
  balancePaisa?: string | number | bigint;
  partyName?: string;
  costCenter?: string;
}

function getPostingDate(l: RawLedgerLine): string {
  if (l.postingDate) return l.postingDate;
  if (l.date) return l.date;
  return '';
}

function getJournalNumber(l: RawLedgerLine): string {
  if (l.journalNumber) return l.journalNumber;
  if (l.journalEntryCode) return l.journalEntryCode;
  return '—';
}

function getNarration(l: RawLedgerLine): string {
  if (l.narration) return l.narration;
  if (l.description) return l.description;
  return '';
}

function getRunningBalance(l: RawLedgerLine): string {
  if (l.runningBalancePaisa !== undefined && l.runningBalancePaisa !== null) {
    return l.runningBalancePaisa.toString();
  }
  if (l.balancePaisa !== undefined && l.balancePaisa !== null) {
    return l.balancePaisa.toString();
  }
  return '0';
}

function mapSingleLedgerLine(l: RawLedgerLine, idx: number): LedgerEntryItem {
  return {
    id: l.id || `line-${idx}`,
    postingDate: getPostingDate(l),
    journalId: l.journalId || '',
    journalNumber: getJournalNumber(l),
    accountCode: l.accountCode || '',
    accountName: l.accountName || '',
    narration: getNarration(l),
    debitPaisa: (l.debitPaisa ?? '0').toString(),
    creditPaisa: (l.creditPaisa ?? '0').toString(),
    runningBalancePaisa: getRunningBalance(l),
    partyName: l.partyName ?? null,
    costCenter: l.costCenter ?? null,
  };
}

function parseLedgerLines(rawLines: unknown[]): LedgerEntryItem[] {
  if (!Array.isArray(rawLines)) return [];
  return rawLines.map((line, idx) => mapSingleLedgerLine(line as RawLedgerLine, idx));
}

export function useLedgerReport(initialFilters: LedgerFilters = {}) {
  const [filters, setFilters] = useState<LedgerFilters>(initialFilters);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const queryParams = useMemo(() => {
    return {
      accountId: filters.accountId || undefined,
      accountCode: filters.accountCode || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      costCenterId: filters.costCenterId || undefined,
      projectId: filters.projectId || undefined,
      limit: 50,
      cursor,
    };
  }, [filters, cursor]);

  const query = useLedgerControllerGetLedger(queryParams);

  const reportData = query.data;
  const lines = useMemo(() => {
    const raw = reportData?.lines;
    return parseLedgerLines(Array.isArray(raw) ? raw : []);
  }, [reportData?.lines]);

  const totals = useMemo(() => {
    return {
      openingBalancePaisa: (reportData?.openingBalancePaisa ?? '0').toString(),
      totalDebitsPaisa: (reportData?.totalDebitPaisa ?? '0').toString(),
      totalCreditsPaisa: (reportData?.totalCreditPaisa ?? '0').toString(),
      closingBalancePaisa: (reportData?.closingBalancePaisa ?? '0').toString(),
      account: reportData?.account,
    };
  }, [reportData]);

  const handleNextPage = () => {
    if (reportData?.nextCursor && typeof reportData.nextCursor === 'string') {
      setCursor(reportData.nextCursor);
    }
  };

  const handleResetPagination = () => {
    setCursor(undefined);
  };

  return {
    filters,
    setFilters,
    lines,
    totals,
    hasMore: Boolean(reportData?.hasMore),
    nextPage: handleNextPage,
    resetPagination: handleResetPagination,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
