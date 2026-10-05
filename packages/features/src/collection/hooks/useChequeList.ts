import { useState, useMemo } from 'react';
import {
  usePaymentControllerListPayments,
  useChequeControllerClearCheque,
  useChequeControllerBounceCheque,
} from '@exzaestate/api-client';
import type {
  ChequeLedgerItem,
  ChequeStatusEnum,
  ChequeActionInput,
} from '../schemas/collection.schema.js';

interface ChequeRecord {
  id: string;
  paymentMethod?: string;
  chequeNumber?: string;
  chequeBank?: string;
  bankName?: string;
  chequeBranch?: string;
  chequeDrawer?: string;
  customerName?: string;
  chequeDate?: string;
  paymentDate?: string;
  createdAt?: string;
  amountPaisa?: string | number | bigint;
  status?: string;
  chequeStatus?: string;
  bookingCode?: string;
  bookingId?: string;
  referenceNotes?: string;
  postedAt?: string;
}

function fallbackStr(...vals: (string | number | bigint | undefined | null)[]): string {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '') {
      return v.toString();
    }
  }
  return '';
}

function resolveChequeStatus(status?: string, chequeStatus?: string): ChequeStatusEnum {
  if (status === 'POSTED') return 'CLEARED';
  if (status === 'CANCELLED' || status === 'BOUNCED') return 'BOUNCED';
  if (chequeStatus) return chequeStatus.toUpperCase() as ChequeStatusEnum;
  return 'PENDING';
}

function parseChequeRecords(data: unknown): ChequeRecord[] {
  if (!data || typeof data !== 'object') return [];
  if ('items' in data && Array.isArray((data as { items: unknown[] }).items)) {
    return (data as { items: ChequeRecord[] }).items;
  }
  if (Array.isArray(data)) {
    return data as ChequeRecord[];
  }
  return [];
}

function mapChequeRecord(p: ChequeRecord): ChequeLedgerItem {
  return {
    id: p.id,
    paymentId: p.id,
    chequeNumber: fallbackStr(p.chequeNumber, 'N/A'),
    bankName: fallbackStr(p.chequeBank, p.bankName, 'Unknown Bank'),
    branchName: fallbackStr(p.chequeBranch),
    drawerName: fallbackStr(p.chequeDrawer, p.customerName),
    chequeDate: fallbackStr(p.chequeDate, p.paymentDate, p.createdAt),
    amountPaisa: fallbackStr(p.amountPaisa, '0'),
    status: resolveChequeStatus(p.status, p.chequeStatus),
    customerName: fallbackStr(p.customerName, 'Customer'),
    bookingCode: fallbackStr(p.bookingCode, p.bookingId),
    bounceReason: p.referenceNotes,
    clearedAt: p.postedAt,
  };
}

function matchesChequeSearch(c: ChequeLedgerItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    c.chequeNumber.toLowerCase().includes(q) ||
    c.bankName.toLowerCase().includes(q) ||
    c.customerName.toLowerCase().includes(q)
  );
}

export function useChequeList() {
  const [statusFilter, setStatusFilter] = useState<ChequeStatusEnum | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const paymentsQuery = usePaymentControllerListPayments();
  const clearChequeMutation = useChequeControllerClearCheque();
  const bounceChequeMutation = useChequeControllerBounceCheque();

  const cheques = useMemo<ChequeLedgerItem[]>(() => {
    const rawList = parseChequeRecords(paymentsQuery.data);
    return rawList
      .filter((p) => p.paymentMethod === 'CHEQUE' || Boolean(p.chequeNumber))
      .map(mapChequeRecord);
  }, [paymentsQuery.data]);

  const filteredCheques = useMemo(() => {
    return cheques.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      return matchesChequeSearch(c, search.trim());
    });
  }, [cheques, statusFilter, search]);

  const clearCheque = async (input: ChequeActionInput) => {
    return clearChequeMutation.mutateAsync({
      paymentId: input.chequeId,
      data: {
        clearingDate: new Date().toISOString().slice(0, 10),
        notes: input.notes,
      },
    });
  };

  const bounceCheque = async (input: ChequeActionInput) => {
    return bounceChequeMutation.mutateAsync({
      paymentId: input.chequeId,
      data: {
        bounceReason: input.bounceReason || 'Cheque bounced by bank',
        notes: input.notes,
      },
    });
  };

  return {
    cheques: filteredCheques,
    allCheques: cheques,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    clearCheque,
    bounceCheque,
    isLoading: paymentsQuery.isLoading,
    isActionLoading: clearChequeMutation.isPending || bounceChequeMutation.isPending,
    refetch: paymentsQuery.refetch,
  };
}
