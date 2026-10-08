import { Injectable } from '@nestjs/common';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PostingService } from '../../accounting/posting/posting.service.js';
import { issuePaymentReceipt, processPaymentAllocation } from '../payment-post.helper.js';
import { PaymentPostedHookRegistry } from '../payment/payment-posted.hook.js';
import { mapPaymentToDto } from '../payment.mapper.js';
import type { PaymentResponseDto } from '../dto/index.js';
import type { BounceChequeDto, ChequeEventResponseDto, ClearChequeDto } from './dto/index.js';
import {
  assertChequeBouncable,
  assertChequeClearable,
  postClearanceJournals,
  recordClearanceHistoryAndEvents,
} from './cheque.helper.js';
import { mapChequeEventToDto } from './cheque.mapper.js';

@Injectable()
export class ChequeService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly postingService: PostingService,
    private readonly hookRegistry: PaymentPostedHookRegistry,
  ) {}

  async clearCheque(
    companyId: string,
    userId: string,
    paymentId: string,
    dto: ClearChequeDto,
  ): Promise<PaymentResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, companyId },
      });
      assertChequeClearable(payment, paymentId);

      const now = new Date();
      const clearingDate = dto.clearingDate ? new Date(dto.clearingDate) : now;

      // 1. Record append-only ChequeEvent
      const chequeEvent = await tx.chequeEvent.create({
        data: {
          companyId,
          paymentId: payment.id,
          event: 'CLEARED',
          chequeNumber: payment.chequeNumber ?? payment.transactionReference ?? 'N/A',
          bankName: payment.bankName,
          branchName: payment.bankBranch,
          chequeDate: payment.chequeDate,
          clearingDate,
          notes: dto.notes,
          createdById: userId,
        },
      });

      // 2. Allocate payment & issue receipt
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

      // 3. Post Accounting Journals
      await postClearanceJournals(
        this.postingService,
        tx,
        companyId,
        userId,
        payment,
        dto,
        allocation.totalAllocatedPaisa,
        allocation.overpaymentPaisa,
        clearingDate,
        chequeEvent.id,
      );

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'Posted',
          chequeStatus: 'CLEARED',
          isDraft: false,
          receiptId: receipt.id,
          postedAt: now,
          postedById: userId,
          notes: dto.notes ?? payment.notes,
        },
      });

      await recordClearanceHistoryAndEvents(
        this.auditService,
        this.outboxService,
        tx,
        companyId,
        userId,
        payment,
        clearingDate,
        chequeEvent.id,
        receiptNumber,
      );

      // 4. Execute in-transaction hooks
      await this.hookRegistry.execute(tx, {
        paymentId: payment.id,
        companyId,
        bookingId: payment.bookingId,
        customerId: payment.customerId,
        propertyId: payment.propertyId,
        projectId: payment.projectId,
        amountPaisa: payment.amountPaisa,
        paymentType: payment.paymentType,
        paymentMethod: 'CHEQUE',
        postedById: userId,
        receiptNumber,
        receiptId: receipt.id,
      });

      return mapPaymentToDto(updated);
    });
  }

  async bounceCheque(
    companyId: string,
    userId: string,
    paymentId: string,
    dto: BounceChequeDto,
  ): Promise<PaymentResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, companyId },
      });
      assertChequeBouncable(payment, paymentId);

      await tx.chequeEvent.create({
        data: {
          companyId,
          paymentId: payment.id,
          event: 'BOUNCED',
          chequeNumber: payment.chequeNumber ?? payment.transactionReference ?? 'N/A',
          bankName: payment.bankName,
          branchName: payment.bankBranch,
          chequeDate: payment.chequeDate,
          bounceReason: dto.bounceReason.trim(),
          notes: dto.notes,
          createdById: userId,
        },
      });

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'Cancelled',
          chequeStatus: 'BOUNCED',
          notes: `Bounced: ${dto.bounceReason.trim()}`,
        },
      });

      await tx.paymentStatusHistory.create({
        data: {
          companyId,
          paymentId: payment.id,
          fromStatus: payment.status,
          toStatus: 'Cancelled',
          reason: `Cheque bounced: ${dto.bounceReason.trim()}`,
          changedById: userId,
        },
      });

      await this.auditService.record(tx, {
        action: 'CHEQUE_BOUNCED',
        module: 'collection',
        recordType: 'Payment',
        recordId: payment.id,
        after: {
          status: 'Cancelled',
          chequeStatus: 'BOUNCED',
          bounceReason: dto.bounceReason.trim(),
        },
      });

      await this.outboxService.emit(tx, 'payment.cheque_bounced', {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        customerId: payment.customerId,
        bounceReason: dto.bounceReason.trim(),
      });

      return mapPaymentToDto(updated);
    });
  }

  async getChequeEvents(companyId: string, paymentId: string): Promise<ChequeEventResponseDto[]> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const events = await tx.chequeEvent.findMany({
        where: { companyId, paymentId },
        orderBy: { createdAt: 'asc' },
      });

      return events.map(mapChequeEventToDto);
    });
  }
}
