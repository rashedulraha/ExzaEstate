import { useState, useMemo, useEffect } from 'react';
import {
  usePeriodControllerGetFiscalYears,
  usePeriodControllerGetPeriods,
  usePeriodControllerClosePeriod,
  usePeriodControllerReopenPeriod,
  usePeriodControllerLockPeriod,
} from '@exzaestate/api-client';
import type { FiscalPeriodItem, PeriodStatusEnum } from '../schemas/accounting.schema.js';

interface RawPeriod {
  id: string;
  fiscalYearId: string;
  fiscalYear?: { name?: string; code?: string };
  periodNumber?: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  closedAt?: string | null;
  closedBy?: string | null;
}

function parseFiscalPeriods(data: unknown): FiscalPeriodItem[] {
  if (!data || typeof data !== 'object') return [];
  let rawList: unknown[] = [];

  if (Array.isArray(data)) {
    rawList = data;
  } else if ('items' in data && Array.isArray((data as { items: unknown[] }).items)) {
    rawList = (data as { items: unknown[] }).items;
  }

  return rawList.map((item) => {
    const p = item as RawPeriod;
    return {
      id: p.id,
      fiscalYearId: p.fiscalYearId,
      fiscalYearLabel: p.fiscalYear?.name || p.fiscalYear?.code || 'Fiscal Year',
      periodNumber: p.periodNumber ?? 1,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      status: (p.status || 'OPEN') as PeriodStatusEnum,
      closedAt: p.closedAt ?? null,
      closedBy: p.closedBy ?? null,
    };
  });
}

export function useFiscalPeriods() {
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string>('');

  const fiscalYearsQuery = usePeriodControllerGetFiscalYears();

  const fiscalYears = useMemo((): Array<{ id: string; name: string }> => {
    const data = fiscalYearsQuery.data;
    let list: Array<{ id?: unknown; name?: unknown }> = [];
    if (Array.isArray(data)) {
      list = data as Array<{ id?: unknown; name?: unknown }>;
    } else if (
      data &&
      typeof data === 'object' &&
      'items' in data &&
      Array.isArray((data as { items: unknown[] }).items)
    ) {
      list = (data as { items: Array<{ id?: unknown; name?: unknown }> }).items;
    }
    return list.map((item) => ({
      id: String(item.id || ''),
      name: String(item.name || 'Fiscal Year'),
    }));
  }, [fiscalYearsQuery.data]);

  useEffect(() => {
    if (!selectedFiscalYearId && fiscalYears.length > 0 && fiscalYears[0]?.id) {
      setSelectedFiscalYearId(fiscalYears[0].id);
    }
  }, [fiscalYears, selectedFiscalYearId]);

  const periodsQuery = usePeriodControllerGetPeriods(
    {
      fiscalYearId: selectedFiscalYearId || '',
    },
    {
      query: {
        enabled: Boolean(selectedFiscalYearId),
      },
    },
  );

  const closePeriodMutation = usePeriodControllerClosePeriod();
  const reopenPeriodMutation = usePeriodControllerReopenPeriod();
  const lockPeriodMutation = usePeriodControllerLockPeriod();

  const periods = useMemo(() => {
    return parseFiscalPeriods(periodsQuery.data);
  }, [periodsQuery.data]);

  const handleClosePeriod = async (periodId: string, notes?: string) => {
    await closePeriodMutation.mutateAsync({
      id: periodId,
      data: { notes },
    });
    periodsQuery.refetch();
  };

  const handleReopenPeriod = async (periodId: string, reason: string) => {
    await reopenPeriodMutation.mutateAsync({
      id: periodId,
      data: { reason },
    });
    periodsQuery.refetch();
  };

  const handleLockPeriod = async (periodId: string) => {
    await lockPeriodMutation.mutateAsync({
      id: periodId,
    });
    periodsQuery.refetch();
  };

  return {
    selectedFiscalYearId,
    setSelectedFiscalYearId,
    fiscalYears,
    periods,
    isLoading: fiscalYearsQuery.isLoading || periodsQuery.isLoading,
    isError: fiscalYearsQuery.isError || periodsQuery.isError,
    error: periodsQuery.error || fiscalYearsQuery.error,
    refetch: periodsQuery.refetch,
    closePeriod: handleClosePeriod,
    reopenPeriod: handleReopenPeriod,
    lockPeriod: handleLockPeriod,
    isSubmitting:
      closePeriodMutation.isPending ||
      reopenPeriodMutation.isPending ||
      lockPeriodMutation.isPending,
  };
}
