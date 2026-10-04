import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DOMAIN_EVENTS, ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PostingService } from '../../accounting/posting/posting.service.js';
import {
  computePaymentState,
  computeRemainingAmountPaisa,
} from '../installment/domain/installment-state.js';
import type {
  PaymentReversalResponseDto,
  ReversePaymentDto,
} from './dto/reverse-payment.dto.js';

@Injectable()
export class ReversalService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly postingService: PostingService,
  ) {}

  async reversePayment(
    companyId: string,
    userId: string,
    paymentId: string,
    dto: ReversePaymentDto,
  ): Promise<PaymentReversalResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, companyId },
        include: { receipt: true },
      });

      if (!payment) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Payment "${paymentId}" not found`,
        });
      }

      if (payment.status !== 'Posted') {
        throw new BadRequestException({
          code: ERROR_CODES.INVALID_STATE_TRANSITION,
          message: `Cannot reverse payment with status "${payment.status}". Only Posted payments can be reversed.`,
        });
      }

      const now = new Date();
      const fiscalYear = now.getFullYear().toString();

      // 1. Generate Reversal Number
      const revSeq = await this.sequenceService.next(tx, {
        type: 'REVERSAL',
        fiscalYear,
      });
      const reversalNumber = this.sequenceService.format({
        prefix: 'REV',
        fiscalYear,
        value: revSeq,
        padding: 5,
      });

      // 2. Void associated Receipt (RULE-IMMUTABLE: receipt is marked void, never deleted)
      await this.voidReceiptIfExists(tx, companyId, payment.receipt, userId, dto.reason, fiscalYear, dto.approvalId, now);

      // 3. Re-open installments (reverse allocation)
      await this.reopenInstallments(tx, companyId, payment.bookingId, payment.amountPaisa);

      // 4. Post PAYMENT_REVERSED mirror journal
      let reversalJournalId: string | undefined;
      if (payment.journalId) {
        const journals = await this.postingService.post(
          companyId,
          userId,
          'PAYMENT_REVERSED',
          {
            originalJournalId: payment.journalId,
            paymentId: payment.id,
            reason: dto.reason.trim(),
            postingDate: now,
            reference: `Reversal ${reversalNumber} of Payment ${payment.paymentNumber}`,
          },
          tx,
        );
        reversalJournalId = journals[0]?.id;
      }

      // 5. Create PaymentReversal record
      const reversalRecord = await tx.paymentReversal.create({
        data: {
          companyId,
          paymentId: payment.id,
          reversalNumber,
          reason: dto.reason.trim(),
          approvalId: dto.approvalId,
          journalId: reversalJournalId,
          reversedById: userId,
        },
      });

      // 6. Update payment status to Reversed
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'Reversed',
          notes: `Reversed via ${reversalNumber}: ${dto.reason.trim()}`,
        },
      });

      await tx.paymentStatusHistory.create({
        data: {
          companyId,
          paymentId: payment.id,
          fromStatus: payment.status,
          toStatus: 'Reversed',
          reason: dto.reason.trim(),
          changedById: userId,
        },
      });

      // 7. Audit log & Outbox event
      await this.auditService.record(tx, {
        action: 'PAYMENT_REVERSED',
        module: 'collection',
        recordType: 'Payment',
        recordId: payment.id,
        before: { status: payment.status },
        after: {
          status: 'Reversed',
          reversalNumber,
          reason: dto.reason.trim(),
        },
      });

      await this.outboxService.emit(tx, DOMAIN_EVENTS.PAYMENT_REVERSED, {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        reversalNumber,
        customerId: payment.customerId,
        amountPaisa: payment.amountPaisa.toString(),
      });

      return {
        id: reversalRecord.id,
        companyId: reversalRecord.companyId,
        paymentId: reversalRecord.paymentId,
        reversalNumber: reversalRecord.reversalNumber,
        reason: reversalRecord.reason,
        approvalId: reversalRecord.approvalId,
        journalId: reversalRecord.journalId,
        reversedById: reversalRecord.reversedById,
        createdAt: reversalRecord.createdAt.toISOString(),
      };
    });
  }

  private async voidReceiptIfExists(
    tx: TenantPrisma,
    companyId: string,
    receipt: { id: string } | null | undefined,
    userId: string,
    reason: string,
    fiscalYear: string,
    approvalId?: string,
    now: Date = new Date(),
  ): Promise<void> {
    if (!receipt) return;
    const voidSeq = await this.sequenceService.next(tx, {
      type: 'VOID',
      fiscalYear,
    });
    const voidNumber = this.sequenceService.format({
      prefix: 'VOID',
      fiscalYear,
      value: voidSeq,
      padding: 5,
    });

    await tx.receiptVoid.create({
      data: {
        companyId,
        receiptId: receipt.id,
        voidNumber,
        reason: reason.trim(),
        approvalId,
        voidedById: userId,
      },
    });

    await tx.receipt.update({
      where: { id: receipt.id },
      data: {
        isVoid: true,
        voidReason: reason.trim(),
        voidedAt: now,
        voidedById: userId,
      },
    });
  }

  private async reopenInstallments(
    tx: TenantPrisma,
    companyId: string,
    bookingId: string | null | undefined,
    paymentAmountPaisa: bigint,
  ): Promise<void> {
    if (!bookingId) return;

    const installments = await tx.installment.findMany({
      where: { companyId, bookingId, paymentState: { not: 'Cancelled' } },
      orderBy: { installmentNumber: 'desc' },
    });

    let amountToReverse = paymentAmountPaisa;
    for (const inst of installments) {
      if (amountToReverse <= 0n) break;
      if (inst.paidAmountPaisa > 0n) {
        const deduction =
          amountToReverse >= inst.paidAmountPaisa ? inst.paidAmountPaisa : amountToReverse;
        const newPaidPaisa = inst.paidAmountPaisa - deduction;
        const newRemainingPaisa = computeRemainingAmountPaisa(inst.amountPaisa, newPaidPaisa, inst.waivedAmountPaisa);
        const newPaymentState = computePaymentState({
          amountPaisa: inst.amountPaisa,
          paidAmountPaisa: newPaidPaisa,
          waivedAmountPaisa: inst.waivedAmountPaisa,
        });

        await tx.installment.update({
          where: { id: inst.id },
          data: {
            paidAmountPaisa: newPaidPaisa,
            remainingAmountPaisa: newRemainingPaisa,
            paymentState: newPaymentState,
          },
        });

        amountToReverse -= deduction;
      }
    }
  }
}
