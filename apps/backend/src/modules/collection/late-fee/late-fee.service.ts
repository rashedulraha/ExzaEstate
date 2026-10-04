import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES, formatMoney } from '@exzaestate/shared';
import type { LateFeeRecord } from '@prisma/client';
import { TenantDb } from '../../../database/tenant-db.service.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { PostingService } from '../../accounting/posting/posting.service.js';
import { calculateLateFee } from './domain/late-fee-calculator.js';
import { ChargeLateFeeDto, LateFeeResponseDto, WaiveLateFeeDto } from './dto/late-fee.dto.js';

function toLateFeeDto(record: LateFeeRecord): LateFeeResponseDto {
  return {
    id: record.id,
    installmentId: record.installmentId,
    amountPaisa: record.amountPaisa.toString(),
    amountFormatted: formatMoney(record.amountPaisa),
    isWaived: record.isWaived,
    waivedAt: record.waivedAt ? record.waivedAt.toISOString() : null,
    waivedById: record.waivedById,
    journalId: record.journalId,
    createdAt: record.createdAt.toISOString(),
  };
}

@Injectable()
export class LateFeeService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly postingService: PostingService,
  ) {}

  async chargeLateFee(
    companyId: string,
    userId: string,
    installmentId: string,
    dto: ChargeLateFeeDto,
  ): Promise<LateFeeResponseDto | null> {
    const ratePct = dto.ratePct ?? 0;
    // With late_fee_rate = 0, nothing is charged (default in system)
    if (ratePct <= 0) {
      return null;
    }

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

      if (installment.paymentState === 'Paid' || installment.paymentState === 'Waived') {
        return null;
      }

      const asOf = dto.asOfDate ? new Date(dto.asOfDate) : new Date();
      const calc = calculateLateFee({
        overduePrincipalPaisa: installment.remainingAmountPaisa,
        dueDate: installment.dueDate,
        asOfDate: asOf,
        lateFeeRatePct: ratePct,
        graceDays: dto.graceDays ?? 7,
      });

      if (!calc.isEligible || calc.lateFeePaisa <= 0n) {
        return null;
      }

      // 1. Post LATE_FEE_CHARGED journal (Dr 1100 Customer Receivable / Cr 4200 Late Fee Income)
      const journals = await this.postingService.post(
        companyId,
        userId,
        'LATE_FEE_CHARGED',
        {
          customerId: installment.booking.customerId,
          feePaisa: calc.lateFeePaisa.toString(),
          postingDate: asOf.toISOString(),
          reference: `LF-${installment.installmentNumber}`,
          description: `Late fee on installment #${installment.installmentNumber} (${calc.overdueDays} days overdue)`,
          projectId: installment.booking.propertyId, // fallback context
        },
        tx,
      );

      const journalId = journals[0]?.id;

      // 2. Create LateFeeRecord
      const record = await tx.lateFeeRecord.create({
        data: {
          companyId,
          installmentId,
          amountPaisa: calc.lateFeePaisa,
          isWaived: false,
          journalId,
          createdById: userId,
        },
      });

      // 3. Audit log
      await this.auditService.record(tx, {
        action: 'LATE_FEE_CHARGED',
        module: 'collection',
        recordType: 'LateFeeRecord',
        recordId: record.id,
        after: {
          installmentId,
          amountPaisa: calc.lateFeePaisa.toString(),
          overdueDays: calc.overdueDays,
          journalId,
        },
      });

      // 4. Outbox event
      await this.outboxService.emit(tx, 'late_fee.charged', {
        recordId: record.id,
        installmentId,
        customerId: installment.booking.customerId,
        amountPaisa: calc.lateFeePaisa.toString(),
      });

      return toLateFeeDto(record);
    });
  }

  async waiveLateFee(
    companyId: string,
    userId: string,
    lateFeeRecordId: string,
    dto: WaiveLateFeeDto,
  ): Promise<LateFeeResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const record = await tx.lateFeeRecord.findFirst({
        where: { id: lateFeeRecordId, companyId },
        include: { installment: { include: { booking: true } } },
      });

      if (!record) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Late fee record "${lateFeeRecordId}" not found`,
        });
      }

      if (record.isWaived) {
        throw new BadRequestException({
          code: ERROR_CODES.INVALID_STATE_TRANSITION,
          message: `Late fee record "${lateFeeRecordId}" is already waived`,
        });
      }

      // 1. Post LATE_FEE_WAIVED journal (Dr 4200 Late Fee Income / Cr 1100 Customer Receivable)
      await this.postingService.post(
        companyId,
        userId,
        'LATE_FEE_WAIVED',
        {
          customerId: record.installment.booking.customerId,
          feePaisa: record.amountPaisa.toString(),
          postingDate: new Date().toISOString(),
          reference: `LF-WAIVE-${record.id.slice(0, 8)}`,
          reason: dto.reason,
        },
        tx,
      );

      // 2. Update record
      const updated = await tx.lateFeeRecord.update({
        where: { id: record.id },
        data: {
          isWaived: true,
          waivedAt: new Date(),
          waivedById: userId,
        },
      });

      // 3. Audit log
      await this.auditService.record(tx, {
        action: 'LATE_FEE_WAIVED',
        module: 'collection',
        recordType: 'LateFeeRecord',
        recordId: record.id,
        before: { isWaived: false },
        after: { isWaived: true, reason: dto.reason },
      });

      // 4. Outbox event
      await this.outboxService.emit(tx, 'late_fee.waived', {
        recordId: record.id,
        installmentId: record.installmentId,
        customerId: record.installment.booking.customerId,
        amountPaisa: record.amountPaisa.toString(),
      });

      return toLateFeeDto(updated);
    });
  }
}
