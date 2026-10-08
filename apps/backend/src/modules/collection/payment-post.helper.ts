import { BadRequestException, NotFoundException } from '@nestjs/common';
import { amountToWords, ERROR_CODES } from '@exzaestate/shared';
import type { Payment } from '@prisma/client';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import type { SequenceService } from '../../platform/sequence/sequence.service.js';
import {
  allocatePayment,
  type AllocationEngineResult,
} from './allocation/domain/allocation-engine.js';

export function assertPaymentPostable(
  payment: Payment | null,
  paymentId: string,
): asserts payment is Payment {
  if (!payment) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Payment with ID "${paymentId}" not found.`,
    });
  }
  if (payment.status === 'Posted') {
    throw new BadRequestException({
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
      message: 'Payment is already posted.',
    });
  }
  if (payment.status === 'Cancelled' || payment.status === 'Reversed') {
    throw new BadRequestException({
      code: ERROR_CODES.INVALID_STATE_TRANSITION,
      message: `Cannot post payment with status "${payment.status}".`,
    });
  }
}

const METHOD_ACCOUNT_MAP: Record<
  string,
  'CASH' | 'BANK_TRANSFER' | 'CARD' | 'GATEWAY' | 'CHEQUE' | 'MOBILE_WALLET'
> = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  BANK: 'BANK_TRANSFER',
  CARD: 'CARD',
  GATEWAY: 'GATEWAY',
  CHEQUE: 'CHEQUE',
  CHECK: 'CHEQUE',
  MOBILE_WALLET: 'MOBILE_WALLET',
  BKASH: 'MOBILE_WALLET',
  NAGAD: 'MOBILE_WALLET',
  ROCKET: 'MOBILE_WALLET',
  WALLET: 'MOBILE_WALLET',
};

export function mapMethodToAccounting(
  method: string,
): 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'GATEWAY' | 'CHEQUE' | 'MOBILE_WALLET' | 'OTHER' {
  const m = method.toUpperCase().replace(/\s+/g, '_');
  return METHOD_ACCOUNT_MAP[m] ?? 'OTHER';
}

export async function processPaymentAllocation(
  tx: TenantPrisma,
  companyId: string,
  payment: Payment,
): Promise<{
  allocation: AllocationEngineResult;
  previousDuePaisa: bigint;
  currentDuePaisa: bigint;
}> {
  const installments = payment.bookingId
    ? await tx.installment.findMany({
        where: { companyId, bookingId: payment.bookingId, paymentState: { not: 'Cancelled' } },
        orderBy: { installmentNumber: 'asc' },
      })
    : [];

  const previousDuePaisa = installments.reduce((acc, i) => acc + i.remainingAmountPaisa, 0n);

  const allocation = allocatePayment({
    paymentAmountPaisa: payment.amountPaisa,
    targetInstallmentId: payment.targetInstallmentId,
    allocationTarget: payment.allocationTarget,
    installments: installments.map((i) => ({
      id: i.id,
      installmentNumber: i.installmentNumber,
      name: i.name,
      type: i.type,
      dueDate: i.dueDate,
      amountPaisa: i.amountPaisa,
      paidAmountPaisa: i.paidAmountPaisa,
      remainingAmountPaisa: i.remainingAmountPaisa,
      lateFeePaisa: i.lateFeePaisa,
    })),
  });

  for (const alloc of allocation.installmentAllocations) {
    await tx.installment.update({
      where: { id: alloc.installmentId },
      data: {
        paidAmountPaisa: alloc.newPaidPaisa,
        remainingAmountPaisa: alloc.newRemainingPaisa,
        paymentState: alloc.newPaymentState,
      },
    });
  }

  const currentDuePaisa =
    previousDuePaisa > allocation.totalAllocatedPaisa
      ? previousDuePaisa - allocation.totalAllocatedPaisa
      : 0n;

  return { allocation, previousDuePaisa, currentDuePaisa };
}

export async function issuePaymentReceipt(
  tx: TenantPrisma,
  sequenceService: SequenceService,
  companyId: string,
  payment: Payment,
  userId: string,
  previousDuePaisa: bigint,
  currentDuePaisa: bigint,
  now: Date,
): Promise<{ receipt: { id: string; receiptNumber: string }; receiptNumber: string }> {
  const fiscalYear = now.getFullYear().toString();
  const receiptSeq = await sequenceService.next(tx, {
    type: 'RECEIPT',
    fiscalYear,
  });
  const receiptNumber = sequenceService.format({
    prefix: 'REC',
    fiscalYear,
    value: receiptSeq,
    padding: 5,
  });

  const amountInWords = amountToWords(payment.amountPaisa);

  const receipt = await tx.receipt.create({
    data: {
      companyId,
      receiptNumber,
      paymentId: payment.id,
      bookingId: payment.bookingId,
      customerId: payment.customerId,
      propertyId: payment.propertyId,
      projectId: payment.projectId,
      amountPaisa: payment.amountPaisa,
      amountInWords,
      previousDuePaisa,
      currentDuePaisa,
      paymentMethod: payment.paymentMethod,
      issuedById: userId,
    },
  });

  return { receipt, receiptNumber };
}
