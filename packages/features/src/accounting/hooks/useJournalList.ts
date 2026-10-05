import { useState, useMemo } from 'react';
import { useJournalControllerGetJournals } from '@exzaestate/api-client';
import type {
  JournalItem,
  JournalLineItem,
  JournalStatusEnum,
  JournalTypeEnum,
} from '../schemas/accounting.schema.js';

export interface JournalFilters {
  status?: JournalStatusEnum | 'ALL';
  type?: JournalTypeEnum | 'ALL';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
}

export interface JournalKpiSummary {
  totalPostedVolumePaisa: string;
  countDraft: number;
  countReview: number;
  countPosted: number;
  countReversed: number;
  totalJournals: number;
}

function toStr(val: unknown, fallback = ''): string {
  if (val !== undefined && val !== null && val !== '') return String(val);
  return fallback;
}

function toNullStr(val: unknown): string | null {
  if (val !== undefined && val !== null && val !== '') return String(val);
  return null;
}

function extractRawArray(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) return data;
  if ('items' in data && Array.isArray((data as { items: unknown[] }).items)) {
    return (data as { items: unknown[] }).items;
  }
  if ('data' in data && Array.isArray((data as { data: unknown[] }).data)) {
    return (data as { data: unknown[] }).data;
  }
  return [];
}

function parseSingleJournalLine(
  line: Record<string, unknown>,
  parentJournalId: string,
): JournalLineItem {
  const accountObj =
    typeof line.account === 'object' && line.account
      ? (line.account as Record<string, unknown>)
      : null;
  const fallbackCode = accountObj ? toStr(accountObj.code) : '';
  const fallbackName = accountObj ? toStr(accountObj.name) : '';

  return {
    id: toStr(line.id),
    journalId: toStr(line.journalId, parentJournalId),
    accountId: toStr(line.accountId),
    accountCode: toStr(line.accountCode, fallbackCode),
    accountName: toStr(line.accountName, fallbackName),
    debitPaisa: toStr(line.debitPaisa, '0'),
    creditPaisa: toStr(line.creditPaisa, '0'),
    description: toNullStr(line.description),
    partyType: toNullStr(line.partyType),
    partyName: toNullStr(line.partyName),
    costCenter: toNullStr(line.costCenter),
    projectName: toNullStr(line.projectName),
  };
}

function parseSingleJournalItem(j: Record<string, unknown>): JournalItem {
  const journalId = toStr(j.id);
  const rawLines = Array.isArray(j.lines) ? j.lines : [];
  const lines = rawLines.map((l) =>
    parseSingleJournalLine(l as Record<string, unknown>, journalId),
  );

  return {
    id: journalId,
    journalNumber: toStr(j.journalNumber, toStr(j.code, 'JRN-UNKNOWN')),
    postingDate: toStr(j.postingDate),
    type: (j.type as JournalTypeEnum) || 'STANDARD',
    status: (j.status as JournalStatusEnum) || 'DRAFT',
    narration: toStr(j.narration),
    reference: toNullStr(j.reference),
    sourceModule: toNullStr(j.sourceModule),
    totalDebitPaisa: toStr(j.totalDebitPaisa, '0'),
    totalCreditPaisa: toStr(j.totalCreditPaisa, '0'),
    postedBy: toNullStr(j.postedBy),
    postedAt: toNullStr(j.postedAt),
    isReversed: Boolean(j.isReversed),
    reversalOfId: toNullStr(j.reversalOfId),
    lines,
  };
}

function parseJournalItems(data: unknown): JournalItem[] {
  const rawList = extractRawArray(data);
  return rawList.map((item) => parseSingleJournalItem(item as Record<string, unknown>));
}

export function computeJournalKpis(items: JournalItem[]): JournalKpiSummary {
  let totalPosted = 0n;
  let countDraft = 0;
  let countReview = 0;
  let countPosted = 0;
  let countReversed = 0;

  for (const item of items) {
    if (item.status === 'POSTED') {
      totalPosted += BigInt(item.totalDebitPaisa || '0');
      countPosted += 1;
    } else if (item.status === 'DRAFT') {
      countDraft += 1;
    } else if (item.status === 'REVIEW') {
      countReview += 1;
    } else if (item.status === 'REVERSED') {
      countReversed += 1;
    }
  }

  return {
    totalPostedVolumePaisa: totalPosted.toString(),
    countDraft,
    countReview,
    countPosted,
    countReversed,
    totalJournals: items.length,
  };
}

export function useJournalList() {
  const [filters, setFilters] = useState<JournalFilters>({
    status: 'ALL',
    type: 'ALL',
    search: '',
    startDate: '',
    endDate: '',
    page: 1,
  });

  const queryParams = useMemo(() => {
    return {
      status: filters.status && filters.status !== 'ALL' ? (filters.status as never) : undefined,
      type: filters.type && filters.type !== 'ALL' ? (filters.type as never) : undefined,
      search: filters.search && filters.search.trim() ? filters.search.trim() : undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      page: filters.page,
      limit: 50,
    };
  }, [filters]);

  const query = useJournalControllerGetJournals(queryParams);
  const items = useMemo(() => parseJournalItems(query.data), [query.data]);
  const kpis = useMemo(() => computeJournalKpis(items), [items]);

  return {
    filters,
    setFilters,
    items,
    kpis,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
