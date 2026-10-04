import type { ChequeEvent } from '@prisma/client';
import type { ChequeEventResponseDto } from './dto/index.js';

export function mapChequeEventToDto(e: ChequeEvent): ChequeEventResponseDto {
  return {
    id: e.id,
    companyId: e.companyId,
    paymentId: e.paymentId,
    event: e.event,
    chequeNumber: e.chequeNumber,
    bankName: e.bankName,
    branchName: e.branchName,
    chequeDate: e.chequeDate ? e.chequeDate.toISOString().slice(0, 10) : null,
    clearingDate: e.clearingDate ? e.clearingDate.toISOString().slice(0, 10) : null,
    bounceReason: e.bounceReason,
    notes: e.notes,
    createdById: e.createdById,
    createdAt: e.createdAt.toISOString(),
  };
}
