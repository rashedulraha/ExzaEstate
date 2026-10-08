import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DOMAIN_EVENTS } from '@exzaestate/shared';
import type { Payment } from '@prisma/client';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { IdempotencyService } from '../../platform/idempotency/idempotency.service.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import { SequenceService } from '../../platform/sequence/sequence.service.js';
import { PostingService } from '../accounting/posting/posting.service.js';
import type { PaymentResponseDto, PostPaymentDto } from './dto/index.js';
import {
  assertPaymentPostable,
  issuePaymentReceipt,
  mapMethodToAccounting,
  processPaymentAllocation,
} from './payment-post.helper.js';
import { PaymentPostedHookRegistry } from './payment/payment-posted.hook.js';
import { mapPaymentToDto } from './payment.mapper.js';

@Injectable()
export class PaymentPostingService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly idempotencyService: IdempotencyService,
    private readonly postingService: PostingService,
    private readonly hookRegistry: PaymentPostedHookRegistry,
  ) {}

  async postPayment(
    companyId: string,
    userId: string,
    paymentId: string,
    dto: PostPaymentDto,
    idempotencyKey?: string,
  ): Promise<PaymentResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const routePattern = `/api/v1/collection/payments/${paymentId}/post`;

      if (idempotencyKey) {
        const requestHash = crypto.createHash('sha256').update(JSON.stringify(dto)).digest('hex');
        const idem = await this.idempotencyService.begin(tx, {
          key: idempotencyKey,
          requestHash,
          method: 'POST',
          routePattern,
          userId,
        });
        if (idem.replayed && idem.body) {
          return idem.body as PaymentResponseDto;
        }
      }

      const payment = await tx.payment.findFirst({
        where: { id: paymentId, companyId },
      });
      assertPaymentPostable(payment, paymentId);

      const now = new Date();
      const isCheque = payment.paymentMethod.toUpperCase() === 'CHEQUE';

      if (isCheque) {
        const chequeResult = await this.handleChequeReceived(
          tx,
          companyId,
          userId,
          payment,
          dto,
          now,
        );
        if (idempotencyKey) {
          await this.idempotencyService.complete(tx, {
            key: idempotencyKey,
            method: 'POST',
            routePattern,
            status: 200,
            body: chequeResult,
            userId,
          });
        }
        return chequeResult;
      }

      const postedResult = await this.handleNonChequePost(tx, companyId, userId, payment, dto, now);

      if (idempotencyKey) {
        await this.idempotencyService.complete(tx, {
          key: idempotencyKey,
          method: 'POST',
          routePattern,
          status: 200,
          body: postedResult,
          userId,
        });
      }

      return postedResult;
    });
  }

  private async handleChequeReceived(
    tx: TenantPrisma,
    companyId: string,
    userId: string,
    payment: Payment,
    dto: PostPaymentDto,
    now: Date,
  ): Promise<PaymentResponseDto> {
    const updatedCheque = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'Received',
        isDraft: false,
        receivedAt: now,
        notes: dto.notes ?? payment.notes,
      },
    });

    await tx.chequeEvent.create({
      data: {
        companyId,
        paymentId: payment.id,
        event: 'RECEIVED',
        chequeNumber: payment.chequeNumber ?? payment.transactionReference ?? 'N/A',
        bankName: payment.bankName,
        branchName: payment.bankBranch,
        chequeDate: payment.chequeDate,
        createdById: userId,
      },
    });

    await tx.paymentStatusHistory.create({
      data: {
        companyId,
        paymentId: payment.id,
        fromStatus: payment.status,
        toStatus: 'Received',
        reason: dto.notes ?? 'Cheque payment received (pending clearance)',
        changedById: userId,
      },
    });

    return mapPaymentToDto(updatedCheque);
  }

  private async handleNonChequePost(
    tx: TenantPrisma,
    companyId: string,
    userId: string,
    payment: Payment,
    dto: PostPaymentDto,
    now: Date,
  ): Promise<PaymentResponseDto> {
    const { allocation, previousDuePaisa, currentDuePaisa } = await processPaymentAllocation(
      tx,
      companyId,
      payment,
    );

    const { receipt, receiptNumber } = await issuePaymentReceipt(
      tx,
      this.sequenceService,
      companyId,
      payment,
      userId,
      previousDuePaisa,
      currentDuePaisa,
      now,
    );

    const journals = await this.postingService.post(
      companyId,
      userId,
      'PAYMENT_POSTED',
      {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        customerId: payment.customerId,
        amountPaisa: payment.amountPaisa.toString(),
        allocatedPaisa: allocation.totalAllocatedPaisa.toString(),
        overpaymentPaisa: allocation.overpaymentPaisa.toString(),
        unallocatedPaisa: '0',
        paymentMethod: mapMethodToAccounting(payment.paymentMethod),
        bankAccountCode: payment.accountNumber ? '1020' : undefined,
        postingDate: now,
        reference: `Payment ${payment.paymentNumber} Receipt ${receiptNumber}`,
        projectId: payment.projectId ?? undefined,
      },
      tx,
    );

    const journalId = journals[0]?.id;

    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'Posted',
        isDraft: false,
        postedAt: now,
        postedById: userId,
        receiptId: receipt.id,
        journalId: journalId ?? payment.journalId,
        notes: dto.notes ?? payment.notes,
      },
    });

    await tx.paymentStatusHistory.create({
      data: {
        companyId,
        paymentId: payment.id,
        fromStatus: payment.status,
        toStatus: 'Posted',
        reason: dto.notes ?? 'Payment posted and receipt issued',
        changedById: userId,
      },
    });

    await this.auditService.record(tx, {
      action: 'PAYMENT_POSTED',
      module: 'collection',
      recordType: 'Payment',
      recordId: payment.id,
      before: { status: payment.status },
      after: {
        status: 'Posted',
        receiptNumber,
        postedAt: now.toISOString(),
        allocatedPaisa: allocation.totalAllocatedPaisa.toString(),
        overpaymentPaisa: allocation.overpaymentPaisa.toString(),
      },
    });

    await this.outboxService.emit(tx, DOMAIN_EVENTS.PAYMENT_POSTED, {
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      receiptNumber,
      amountPaisa: payment.amountPaisa.toString(),
      bookingId: payment.bookingId,
      customerId: payment.customerId,
    });

    await this.hookRegistry.execute(tx, {
      paymentId: payment.id,
      companyId,
      bookingId: payment.bookingId,
      customerId: payment.customerId,
      propertyId: payment.propertyId,
      projectId: payment.projectId,
      amountPaisa: payment.amountPaisa,
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod,
      postedById: userId,
      receiptNumber,
      receiptId: receipt.id,
    });

    return mapPaymentToDto(updated);
  }
}
