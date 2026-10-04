import {
  BankReconciliationResponseDto,
  ReconciliationItemResponseDto,
} from './dto/bank-reconciliation.dto.js';

export interface RawItem {
  id: string;
  journalLineId: string;
  clearedDate: Date;
  isCleared: boolean;
  notes: string | null;
  journalLine?: {
    debitPaisa: bigint;
    creditPaisa: bigint;
    description: string | null;
    journal: {
      journalNumber: string;
      postingDate: Date;
    };
  } | null;
}

export interface RawReconciliation {
  id: string;
  companyId: string;
  bankAccountId: string;
  statementDate: Date;
  statementBalancePaisa: bigint;
  bookBalancePaisa: bigint;
  reconciledBalancePaisa: bigint;
  differencePaisa: bigint;
  status: string;
  completedAt: Date | null;
  completedById: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: RawItem[];
}

export function mapBankReconciliationToDto(r: RawReconciliation): BankReconciliationResponseDto {
  const itemsDto: ReconciliationItemResponseDto[] | undefined = r.items?.map((i) => ({
    id: i.id,
    journalLineId: i.journalLineId,
    clearedDate: i.clearedDate.toISOString().split('T')[0] ?? '',
    isCleared: i.isCleared,
    notes: i.notes,
    journalNumber: i.journalLine?.journal.journalNumber,
    postingDate: i.journalLine?.journal.postingDate.toISOString().split('T')[0],
    description: i.journalLine?.description,
    debitPaisa: i.journalLine?.debitPaisa.toString(),
    creditPaisa: i.journalLine?.creditPaisa.toString(),
  }));

  return {
    id: r.id,
    companyId: r.companyId,
    bankAccountId: r.bankAccountId,
    statementDate: r.statementDate.toISOString().split('T')[0] ?? '',
    statementBalancePaisa: r.statementBalancePaisa.toString(),
    bookBalancePaisa: r.bookBalancePaisa.toString(),
    reconciledBalancePaisa: r.reconciledBalancePaisa.toString(),
    differencePaisa: r.differencePaisa.toString(),
    status: r.status,
    completedAt: r.completedAt?.toISOString() ?? null,
    completedById: r.completedById,
    notes: r.notes,
    items: itemsDto,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
