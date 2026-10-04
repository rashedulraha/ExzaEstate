import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantPrisma } from '../../../database/tenant-prisma.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';

export const DEFAULT_MANUAL_JOURNAL_THRESHOLD = 100_000_000n; // ৳10,00,000 in paisa

export async function checkManualJournalApproval(
  tx: TenantPrisma,
  companyId: string,
  userId: string,
  isManagingDirector: boolean,
  totalDebit: bigint,
  type?: string,
): Promise<void> {
  const userRoles = await tx.userRole.findMany({
    where: { companyId, userId },
    include: { role: { select: { code: true } } },
  });

  const isDirector =
    isManagingDirector ||
    userRoles.some(
      (ur: { role: { code: string } }) =>
        ur.role.code === 'MANAGING_DIRECTOR' || ur.role.code === 'GENERAL_MANAGER',
    );

  if (
    (type ?? 'GENERAL') === 'GENERAL' &&
    totalDebit > DEFAULT_MANUAL_JOURNAL_THRESHOLD &&
    !isDirector
  ) {
    throw new AppException(
      ERROR_CODES.APPROVAL_REQUIRED,
      'Manual journal exceeds approval threshold of ৳10,00,000 and requires approval',
      {
        totalDebit: totalDebit.toString(),
        threshold: DEFAULT_MANUAL_JOURNAL_THRESHOLD.toString(),
      },
      HttpStatus.CONFLICT,
    );
  }
}

export async function generateJournalNumber(
  tx: TenantPrisma,
  sequenceService: SequenceService,
  periodName: string,
): Promise<string> {
  const fyName = periodName.split(' ')[1] || '2026-2027';
  const seq = await sequenceService.next(tx, {
    type: 'JOURNAL_VOUCHER',
    fiscalYear: fyName,
  });
  return sequenceService.format({
    prefix: 'JV',
    fiscalYear: fyName,
    value: seq,
    padding: 6,
  });
}
