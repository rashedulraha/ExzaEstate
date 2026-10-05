import { useState, useMemo } from 'react';
import { useAgingControllerGetAgingReport } from '@exzaestate/api-client';
import type { CustomerAgingRow } from '../schemas/collection.schema.js';

export interface AgingBucketSummary {
  bucket: '1_7' | '8_30' | '31_60' | '61_90' | '90_PLUS';
  label: string;
  amountPaisa: string;
  amountFormatted: string;
  count: number;
  percentage: number;
}

interface RawAgingBucket {
  bucket: string;
  label?: string;
  amountPaisa?: string | number | bigint;
  amountFormatted?: string;
  installmentCount?: number;
}

interface RawAgingReport {
  totalReceivablePaisa?: string;
  totalReceivableFormatted?: string;
  reconciledWithArLedger?: boolean;
  buckets?: RawAgingBucket[];
  byCustomer?: CustomerAgingRow[];
}

function normalizeBucketKey(rawBucket: string): AgingBucketSummary['bucket'] {
  if (rawBucket.includes('8') || rawBucket.includes('30')) return '8_30';
  if (rawBucket.includes('31') || rawBucket.includes('60')) return '31_60';
  if (rawBucket.includes('61') || rawBucket.includes('90')) return '61_90';
  if (rawBucket.includes('PLUS') || rawBucket.includes('90+')) return '90_PLUS';
  return '1_7';
}

function getDefaultBuckets(): AgingBucketSummary[] {
  return [
    {
      bucket: '1_7',
      label: '1–7 Days',
      amountPaisa: '0',
      amountFormatted: '৳0.00',
      count: 0,
      percentage: 0,
    },
    {
      bucket: '8_30',
      label: '8–30 Days',
      amountPaisa: '0',
      amountFormatted: '৳0.00',
      count: 0,
      percentage: 0,
    },
    {
      bucket: '31_60',
      label: '31–60 Days',
      amountPaisa: '0',
      amountFormatted: '৳0.00',
      count: 0,
      percentage: 0,
    },
    {
      bucket: '61_90',
      label: '61–90 Days',
      amountPaisa: '0',
      amountFormatted: '৳0.00',
      count: 0,
      percentage: 0,
    },
    {
      bucket: '90_PLUS',
      label: '90+ Days',
      amountPaisa: '0',
      amountFormatted: '৳0.00',
      count: 0,
      percentage: 0,
    },
  ];
}

function parseAgingBuckets(reportData?: RawAgingReport): AgingBucketSummary[] {
  if (!reportData?.buckets || !Array.isArray(reportData.buckets)) {
    return getDefaultBuckets();
  }

  const totalReceivable = BigInt(reportData.totalReceivablePaisa || '0');

  return reportData.buckets.map((b) => {
    const amount = BigInt(b.amountPaisa || '0');
    const pct = totalReceivable > 0n ? Number((amount * 10000n) / totalReceivable) / 100 : 0;
    const key = normalizeBucketKey(b.bucket);

    return {
      bucket: key,
      label: b.label || key,
      amountPaisa: (b.amountPaisa ?? '0').toString(),
      amountFormatted: b.amountFormatted || '৳0.00',
      count: Number(b.installmentCount || 0),
      percentage: pct,
    };
  });
}

export function useAgingDashboard() {
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const query = useAgingControllerGetAgingReport({
    asOfDate: asOfDate || undefined,
  });

  const reportData = query.data as unknown as RawAgingReport | undefined;

  const buckets = useMemo<AgingBucketSummary[]>(() => {
    return parseAgingBuckets(reportData);
  }, [reportData]);

  const customerRows = useMemo<CustomerAgingRow[]>(() => {
    return (
      Array.isArray(reportData?.byCustomer) ? reportData.byCustomer : []
    ) as CustomerAgingRow[];
  }, [reportData]);

  return {
    asOfDate,
    setAsOfDate,
    report: reportData,
    buckets,
    customerRows,
    totalReceivablePaisa: reportData?.totalReceivablePaisa || '0',
    totalReceivableFormatted: reportData?.totalReceivableFormatted || '৳0.00',
    isReconciled: Boolean(reportData?.reconciledWithArLedger),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
