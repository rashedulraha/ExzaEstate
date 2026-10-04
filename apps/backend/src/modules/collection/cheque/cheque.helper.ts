import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DOMAIN_EVENTS, ERROR_CODES } from '@exzaestate/shared';
import type { Payment } from '@prisma/client';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import type { PostingService } from '../../accounting/posting/posting.service.js';
import type { ClearChequeDto } from './dto/index.js';

export function assertChequeClearable(payment: Payment | null, paymentId: string): asserts payment is Payment {
  if (!payment) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Payment "${paymentId}" not found`,
    });
  }
  if (payment.paymentMethod.toUpperCase() !== 'CHEQUE') {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `Payment "${paymentId}" is not a cheque payment`,
    });
  }
  if (payment.status !== 'Received' && payment.status !== 'Draft') {
    throw new BadRequestException({
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
      message: `Cannot clear cheque with payment status "${payment.status}"`,
    });
  }
}

export function assertChequeBouncable(payment: Payment | null, paymentId: string): asserts payment is Payment {
  if (!payment) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Payment "${paymentId}" not found`,
    });
  }
  if (payment.paymentMethod.toUpperCase() !== 'CHEQUE') {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `Payment "${paymentId}" is not a cheque payment`,
    });
  }
}

export async function postClearanceJournals(
  postingService: PostingService,
  tx: TenantPrisma,
  companyId: string,
  userId: string,
  payment: Payment,
  dto: ClearChequeDto,
  allocatedPaisa: bigint,
  overpaymentPaisa: bigint,
  clearingDate: Date,
  chequeEventId: string,
): Promise<void> {
  await postingService.post(
    companyId,
    userId,
    'PAYMENT_POSTED',
    {
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      customerId: payment.customerId,
      amountPaisa: payment.amountPaisa.toString(),
      allocatedPaisa: allocatedPaisa.toString(),
      overpaymentPaisa: overpaymentPaisa.toString(),
      unallocatedPaisa: '0',
      paymentMethod: 'CHEQUE',
      postingDate: clearingDate,
      reference: `Cheque Cleared ${payment.chequeNumber ?? payment.paymentNumber}`,
      projectId: payment.projectId ?? undefined,
    },
    tx,
  );

  await postingService.post(
    companyId,
    userId,
    'CHEQUE_CLEARED',
    {
      chequeId: chequeEventId,
      bankAccountCode: dto.bankAccountCode ?? '1020',
      amountPaisa: payment.amountPaisa.toString(),
      postingDate: clearingDate,
      reference: `Cheque clearance ${payment.chequeNumber ?? payment.paymentNumber}`,
    },
    tx,
  );
}

export async function recordClearanceHistoryAndEvents(
  auditService: AuditService,
  outboxService: OutboxService,
  tx: TenantPrisma,
  companyId: string,
  userId: string,
  payment: Payment,
  clearingDate: Date,
  chequeEventId: string,
  receiptNumber: string,
): Promise<void> {
  await tx.paymentStatusHistory.create({
    data: {
      companyId,
      paymentId: payment.id,
      fromStatus: payment.status,
      toStatus: 'Posted',
      reason: `Cheque cleared on ${clearingDate.toISOString().slice(0, 10)}`,
      changedById: userId,
    },
  });

  await auditService.record(tx, {
    action: 'CHEQUE_CLEARED',
    module: 'collection',
    recordType: 'Payment',
    recordId: payment.id,
    after: {
      chequeEventId,
      receiptNumber,
      clearingDate: clearingDate.toISOString(),
    },
  });

  await outboxService.emit(tx, DOMAIN_EVENTS.PAYMENT_POSTED, {
    paymentId: payment.id,
    paymentNumber: payment.paymentNumber,
    receiptNumber,
    amountPaisa: payment.amountPaisa.toString(),
    bookingId: payment.bookingId,
    customerId: payment.customerId,
  });
}
