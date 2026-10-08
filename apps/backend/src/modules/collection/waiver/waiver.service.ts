import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES, formatMoney } from '@exzaestate/shared';
import type { InstallmentWaiver } from '@prisma/client';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PostingService } from '../../accounting/posting/posting.service.js';
import { RequestWaiverDto, WaiverResponseDto } from './dto/waiver.dto.js';

function toWaiverDto(record: InstallmentWaiver): WaiverResponseDto {
  return {
    id: record.id,
    waiverNumber: record.waiverNumber,
    installmentId: record.installmentId,
    amountPaisa: record.amountPaisa.toString(),
    amountFormatted: formatMoney(record.amountPaisa),
    status: record.status,
    reason: record.reason,
    approvalId: record.approvalId,
    createdAt: record.createdAt.toISOString(),
  };
}

@Injectable()
export class WaiverService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly postingService: PostingService,
  ) {}

  async waiveInstallment(
    companyId: string,
    userId: string,
    installmentId: string,
    dto: RequestWaiverDto,
  ): Promise<WaiverResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const installment = await tx.installment.findFirst({
        where: { id: installmentId, companyId },
        include: { booking: true },
      });

      if (!installment) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Installment "${installmentId}" not found`,
        });
      }

      if (installment.paymentState === 'Paid' || installment.paymentState === 'Cancelled') {
        throw new BadRequestException({
          code: ERROR_CODES.INVALID_STATE_TRANSITION,
          message: `Cannot waive an installment with state "${installment.paymentState}"`,
        });
      }

      if (installment.remainingAmountPaisa <= 0n) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Installment has no remaining principal to waive',
        });
      }

      let waiveAmount = installment.remainingAmountPaisa;
      if (dto.amountPaisa !== undefined) {
        const reqAmount = BigInt(dto.amountPaisa);
        if (reqAmount <= 0n) {
          throw new BadRequestException({
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Waiver amount must be greater than zero',
          });
        }
        if (reqAmount > installment.remainingAmountPaisa) {
          throw new BadRequestException({
            code: ERROR_CODES.VALIDATION_ERROR,
            message: `Waiver amount (${reqAmount}) cannot exceed remaining principal (${installment.remainingAmountPaisa})`,
          });
        }
        waiveAmount = reqAmount;
      }

      const fiscalYear = new Date().getFullYear().toString();
      const seq = await this.sequenceService.next(tx, {
        type: 'WAIVER',
        fiscalYear,
        scopeKey: 'GLOBAL',
      });

      const waiverNumber = this.sequenceService.format({
        prefix: 'WVR',
        fiscalYear,
        value: seq,
      });

      // 1. Create InstallmentWaiver record
      const waiver = await tx.installmentWaiver.create({
        data: {
          companyId,
          waiverNumber,
          installmentId,
          amountPaisa: waiveAmount,
          status: 'Approved',
          reason: dto.reason,
          createdById: userId,
        },
      });

      // 2. Update installment amounts and state
      const newRemaining = installment.remainingAmountPaisa - waiveAmount;
      const newWaived = (installment.waivedAmountPaisa ?? 0n) + waiveAmount;
      const newPaymentState = newRemaining === 0n ? 'Waived' : installment.paymentState;

      await tx.installment.update({
        where: { id: installment.id },
        data: {
          remainingAmountPaisa: newRemaining,
          waivedAmountPaisa: newWaived,
          paymentState: newPaymentState,
        },
      });

      // 3. Post INSTALLMENT_WAIVED adjustment journal (Dr 5900 Discount / Cr 1100 Customer Receivable)
      await this.postingService.post(
        companyId,
        userId,
        'INSTALLMENT_WAIVED',
        {
          installmentId: installment.id,
          bookingId: installment.bookingId,
          customerId: installment.booking.customerId,
          amountPaisa: waiveAmount.toString(),
          postingDate: new Date().toISOString(),
          reference: waiverNumber,
          reason: dto.reason,
        },
        tx,
      );

      // 4. Audit log
      await this.auditService.record(tx, {
        action: 'INSTALLMENT_WAIVED',
        module: 'collection',
        recordType: 'InstallmentWaiver',
        recordId: waiver.id,
        after: {
          waiverNumber,
          installmentId,
          amountPaisa: waiveAmount.toString(),
          newRemainingPaisa: newRemaining.toString(),
          paymentState: newPaymentState,
        },
      });

      // 5. Outbox event
      await this.outboxService.emit(tx, 'installment.waived', {
        waiverId: waiver.id,
        waiverNumber,
        installmentId,
        bookingId: installment.bookingId,
        customerId: installment.booking.customerId,
        amountPaisa: waiveAmount.toString(),
      });

      return toWaiverDto(waiver);
    });
  }
}
