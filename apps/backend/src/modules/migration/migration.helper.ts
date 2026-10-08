import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ERROR_CODES, formatMoney } from '@exzaestate/shared';
import type { MigrationBatch, Prisma } from '@prisma/client';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { SequenceService } from '../../platform/sequence/sequence.service.js';
import type {
  AddLegacyBookingDto,
  CustomerReconciliationDifferenceDto,
  MigrationBatchResponseDto,
  PostOpeningBalanceDto,
  ReconciliationGateResponseDto,
} from './dto/migration.dto.js';

export function assertBatchEditable(
  batch: MigrationBatch | null,
  batchId: string,
): asserts batch is MigrationBatch {
  if (!batch) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Migration batch "${batchId}" not found`,
    });
  }

  if (batch.status === 'Finalized') {
    throw new BadRequestException({
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
      message: 'Cannot modify a finalized migration batch',
    });
  }
}

export function toBatchDto(record: MigrationBatch, bookingCount = 0): MigrationBatchResponseDto {
  return {
    id: record.id,
    batchNumber: record.batchNumber,
    status: record.status,
    goLiveDate:
      record.goLiveDate instanceof Date
        ? record.goLiveDate.toISOString().slice(0, 10)
        : String(record.goLiveDate ?? '').slice(0, 10),
    notes: record.notes,
    openingJournalId: record.openingJournalId,
    finalizedAt: record.finalizedAt ? record.finalizedAt.toISOString() : null,
    finalizedById: record.finalizedById,
    legacyBookingCount: bookingCount,
    createdAt: record.createdAt.toISOString(),
  };
}

export function validateOpeningBalanceLines(dto: PostOpeningBalanceDto): {
  totalDebitPaisa: bigint;
  totalCreditPaisa: bigint;
} {
  let totalDebit = 0n;
  let totalCredit = 0n;

  for (const line of dto.lines) {
    totalDebit += BigInt(line.debitPaisa ?? '0');
    totalCredit += BigInt(line.creditPaisa ?? '0');
  }

  if (totalDebit !== totalCredit) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `Opening balance journal is unbalanced: Total Debits (${totalDebit}) !== Total Credits (${totalCredit})`,
    });
  }

  return { totalDebitPaisa: totalDebit, totalCreditPaisa: totalCredit };
}

export async function resolveAccountMap(
  tx: {
    account: {
      findMany: (args: {
        where: { companyId: string; code: { in: string[] } };
      }) => Promise<{ code: string; id: string }[]>;
    };
  },
  companyId: string,
  accountCodes: string[],
): Promise<Map<string, string>> {
  const accounts = await tx.account.findMany({
    where: { companyId, code: { in: accountCodes } },
  });
  const accountMap = new Map(accounts.map((a) => [a.code, a.id]));

  for (const code of accountCodes) {
    if (!accountMap.has(code)) {
      throw new BadRequestException({
        code: ERROR_CODES.NOT_FOUND,
        message: `Account with code "${code}" not found for company`,
      });
    }
  }

  return accountMap;
}

export async function createOpeningJournalRecord(
  tx: TenantPrisma,
  sequenceService: SequenceService,
  companyId: string,
  userId: string,
  batch: MigrationBatch,
  dto: PostOpeningBalanceDto,
  totalDebitPaisa: bigint,
  accountMap: Map<string, string>,
): Promise<{ id: string; journalNumber: string }> {
  const fiscalYear = new Date().getFullYear().toString();
  const seq = await sequenceService.next(tx, {
    type: 'JOURNAL',
    fiscalYear,
    scopeKey: 'GLOBAL',
  });
  const journalNumber = sequenceService.format({
    prefix: 'JRN-OPN',
    fiscalYear,
    value: seq,
  });

  const postingDate = dto.postingDate ? new Date(dto.postingDate) : batch.goLiveDate;

  const journal = await tx.journal.create({
    data: {
      companyId,
      journalNumber,
      type: 'OPENING',
      status: 'Posted',
      postingDate,
      narration: dto.narration ?? 'Go-Live Opening Balance Journal',
      reference: batch.batchNumber,
      sourceModule: 'migration',
      sourceDocumentId: batch.id,
      sourceEventType: 'OPENING_BALANCE',
      totalAmount: totalDebitPaisa,
      postedAt: new Date(),
      postedById: userId,
      createdById: userId,
      updatedById: userId,
      lines: {
        create: dto.lines.map((line, idx) => ({
          companyId,
          lineNumber: idx + 1,
          accountId: accountMap.get(line.accountCode)!,
          debitPaisa: BigInt(line.debitPaisa),
          creditPaisa: BigInt(line.creditPaisa),
          description: line.description ?? `Opening balance for ${line.accountCode}`,
          partyType: line.customerId ? 'CUSTOMER' : null,
          partyId: line.customerId,
        })),
      },
    },
  });

  return { id: journal.id, journalNumber };
}

export async function createLegacyBookingRecord(
  tx: TenantPrisma,
  companyId: string,
  userId: string,
  batchId: string,
  dto: AddLegacyBookingDto,
): Promise<{ id: string; legacyBookingNo: string; outstandingPaisa: bigint }> {
  const netPrice = BigInt(dto.netPricePaisa);
  const totalPaid = BigInt(dto.totalPaidPaisa);

  if (totalPaid > netPrice) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `Total paid (${totalPaid}) cannot exceed net price (${netPrice})`,
    });
  }

  const outstandingPaisa = netPrice - totalPaid;

  const record = await tx.legacyBookingRecord.create({
    data: {
      companyId,
      batchId,
      customerId: dto.customerId,
      legacyBookingNo: dto.legacyBookingNo,
      netPricePaisa: netPrice,
      totalPaidPaisa: totalPaid,
      outstandingPaisa,
      historicalPayments: dto.historicalPayments
        ? (dto.historicalPayments as unknown as Prisma.InputJsonValue)
        : [],
      createdById: userId,
    },
  });

  return { id: record.id, legacyBookingNo: record.legacyBookingNo, outstandingPaisa };
}

interface ArLine {
  partyId: string | null;
  debitPaisa: bigint;
  creditPaisa: bigint;
}

interface LegacyRec {
  customerId: string;
  outstandingPaisa: bigint;
  customer: { name: string };
}

function groupCustomerOpeningAr(arLines: ArLine[]): {
  customerOpeningAr: Map<string, bigint>;
  totalOpeningAr: bigint;
} {
  const customerOpeningAr = new Map<string, bigint>();
  let totalOpeningAr = 0n;

  for (const l of arLines) {
    const net = l.debitPaisa - l.creditPaisa;
    totalOpeningAr += net;
    if (l.partyId) {
      const current = customerOpeningAr.get(l.partyId) ?? 0n;
      customerOpeningAr.set(l.partyId, current + net);
    }
  }

  return { customerOpeningAr, totalOpeningAr };
}

function groupCustomerLegacyOutstanding(legacyRecords: LegacyRec[]): {
  customerLegacyOutstanding: Map<string, { customerName: string; outstanding: bigint }>;
  totalLegacyOutstanding: bigint;
} {
  const customerLegacyOutstanding = new Map<
    string,
    { customerName: string; outstanding: bigint }
  >();
  let totalLegacyOutstanding = 0n;

  for (const rec of legacyRecords) {
    totalLegacyOutstanding += rec.outstandingPaisa;
    const existing = customerLegacyOutstanding.get(rec.customerId);
    if (existing) {
      existing.outstanding += rec.outstandingPaisa;
    } else {
      customerLegacyOutstanding.set(rec.customerId, {
        customerName: rec.customer.name,
        outstanding: rec.outstandingPaisa,
      });
    }
  }

  return { customerLegacyOutstanding, totalLegacyOutstanding };
}

function buildCustomerDifferences(
  allCustomerIds: Set<string>,
  customerOpeningAr: Map<string, bigint>,
  customerLegacyOutstanding: Map<string, { customerName: string; outstanding: bigint }>,
): CustomerReconciliationDifferenceDto[] {
  const customerDifferences: CustomerReconciliationDifferenceDto[] = [];

  for (const custId of allCustomerIds) {
    const openAr = customerOpeningAr.get(custId) ?? 0n;
    const legacyRec = customerLegacyOutstanding.get(custId);
    const legacyOut = legacyRec?.outstanding ?? 0n;
    const custName = legacyRec?.customerName ?? `Customer ${custId.slice(0, 8)}`;
    const diff = openAr >= legacyOut ? openAr - legacyOut : legacyOut - openAr;

    customerDifferences.push({
      customerId: custId,
      customerName: custName,
      openingArPaisa: openAr.toString(),
      legacyOutstandingPaisa: legacyOut.toString(),
      differencePaisa: diff.toString(),
      isReconciled: diff === 0n,
    });
  }

  return customerDifferences;
}

export function computeReconciliationGate(
  batchId: string,
  arLines: ArLine[],
  legacyRecords: LegacyRec[],
): ReconciliationGateResponseDto {
  const { customerOpeningAr, totalOpeningAr } = groupCustomerOpeningAr(arLines);
  const { customerLegacyOutstanding, totalLegacyOutstanding } =
    groupCustomerLegacyOutstanding(legacyRecords);

  const allCustomerIds = new Set([
    ...Array.from(customerOpeningAr.keys()),
    ...Array.from(customerLegacyOutstanding.keys()),
  ]);

  const customerDifferences = buildCustomerDifferences(
    allCustomerIds,
    customerOpeningAr,
    customerLegacyOutstanding,
  );

  const totalDiff =
    totalOpeningAr >= totalLegacyOutstanding
      ? totalOpeningAr - totalLegacyOutstanding
      : totalLegacyOutstanding - totalOpeningAr;

  return {
    batchId,
    totalOpeningArPaisa: totalOpeningAr.toString(),
    totalOpeningArFormatted: formatMoney(totalOpeningAr),
    totalLegacyOutstandingPaisa: totalLegacyOutstanding.toString(),
    totalLegacyOutstandingFormatted: formatMoney(totalLegacyOutstanding),
    differencePaisa: totalDiff.toString(),
    differenceFormatted: formatMoney(totalDiff),
    canFinalize: totalDiff === 0n,
    customerDifferences,
  };
}
