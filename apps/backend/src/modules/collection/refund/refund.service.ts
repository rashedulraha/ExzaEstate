import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DOMAIN_EVENTS, ERROR_CODES, formatMoney } from '@exzaestate/shared';
import type { Prisma, Refund } from '@prisma/client';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { OutboxService } from '../../../platform/outbox/outbox.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PostingService } from '../../accounting/posting/posting.service.js';
import { PayRefundDto, QueryRefundDto, RefundResponseDto, RefundStatus } from './dto/refund.dto.js';

function toRefundResponseDto(record: Refund): RefundResponseDto {
  return {
    id: record.id,
    companyId: record.companyId,
    refundNumber: record.refundNumber,
    bookingId: record.bookingId,
    customerId: record.customerId,
    amountPaisa: record.amountPaisa.toString(),
    amountFormatted: formatMoney(record.amountPaisa),
    status: record.status,
    reason: record.reason,
    approvalId: record.approvalId,
    paidAt: record.paidAt ? record.paidAt.toISOString() : null,
    paidById: record.paidById,
    paymentMethod: record.paymentMethod,
    bankAccountId: record.bankAccountId,
    journalId: record.journalId,
    createdAt: record.createdAt.toISOString(),
  };
}

@Injectable()
export class RefundService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly postingService: PostingService,
  ) {}

  async createRefund(
    tx: TenantPrisma,
    data: {
      companyId: string;
      bookingId: string;
      customerId: string;
      amountPaisa: bigint;
      reason?: string;
      approvalId?: string;
      status?: string;
      createdById: string;
    },
  ): Promise<Refund> {
    const fiscalYear = new Date().getFullYear().toString();
    const seq = await this.sequenceService.next(tx, {
      type: 'REFUND',
      fiscalYear,
      scopeKey: 'GLOBAL',
    });

    const refundNumber = this.sequenceService.format({
      prefix: 'RFD',
      fiscalYear,
      value: seq,
    });

    const refund = await tx.refund.create({
      data: {
        companyId: data.companyId,
        refundNumber,
        bookingId: data.bookingId,
        customerId: data.customerId,
        amountPaisa: data.amountPaisa,
        status: data.status ?? RefundStatus.APPROVED,
        reason: data.reason,
        approvalId: data.approvalId,
        createdById: data.createdById,
      },
    });

    await this.auditService.record(tx, {
      action: 'REFUND_CREATED',
      module: 'collection',
      recordType: 'Refund',
      recordId: refund.id,
      after: {
        refundNumber: refund.refundNumber,
        amountPaisa: refund.amountPaisa.toString(),
        bookingId: refund.bookingId,
        customerId: refund.customerId,
        status: refund.status,
      },
    });

    return refund;
  }

  async payRefund(
    companyId: string,
    userId: string,
    refundId: string,
    dto: PayRefundDto,
  ): Promise<RefundResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const refund = await tx.refund.findFirst({
        where: { id: refundId, companyId },
      });

      if (!refund) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Refund with ID "${refundId}" not found`,
        });
      }

      if (refund.status === RefundStatus.PAID) {
        throw new BadRequestException({
          code: ERROR_CODES.INVALID_STATE_TRANSITION,
          message: `Refund "${refundId}" has already been paid`,
        });
      }

      if (refund.status === RefundStatus.REJECTED) {
        throw new BadRequestException({
          code: ERROR_CODES.INVALID_STATE_TRANSITION,
          message: `Cannot pay rejected refund "${refundId}"`,
        });
      }

      // Post REFUND_PAID accounting journal (Dr 2500 Refunds Payable / Cr Cash or Bank)
      const journals = await this.postingService.post(
        companyId,
        userId,
        'REFUND_PAID',
        {
          refundId: refund.id,
          bookingId: refund.bookingId,
          customerId: refund.customerId,
          refundPaisa: refund.amountPaisa.toString(),
          paymentMethod: dto.paymentMethod,
          bankAccountCode: dto.bankAccountCode,
          reference: dto.reference ?? refund.refundNumber,
          postingDate: new Date().toISOString(),
        },
        tx,
      );

      const journalId = journals[0]?.id;

      const updated = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.PAID,
          paidAt: new Date(),
          paidById: userId,
          paymentMethod: dto.paymentMethod,
          bankAccountId: dto.bankAccountId,
          journalId,
        },
      });

      await this.auditService.record(tx, {
        action: 'REFUND_PAID',
        module: 'collection',
        recordType: 'Refund',
        recordId: refund.id,
        before: { status: refund.status },
        after: {
          status: updated.status,
          paidAt: updated.paidAt,
          paymentMethod: dto.paymentMethod,
          journalId,
        },
      });

      await this.outboxService.emit(tx, DOMAIN_EVENTS.REFUND_PAID, {
        refundId: updated.id,
        refundNumber: updated.refundNumber,
        bookingId: updated.bookingId,
        customerId: updated.customerId,
        amountPaisa: updated.amountPaisa.toString(),
        paymentMethod: dto.paymentMethod,
        journalId,
      });

      return toRefundResponseDto(updated);
    });
  }

  async getRefundById(companyId: string, refundId: string): Promise<RefundResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const record = await tx.refund.findFirst({
        where: { id: refundId, companyId },
      });

      if (!record) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Refund with ID "${refundId}" not found`,
        });
      }

      return toRefundResponseDto(record);
    });
  }

  async listRefunds(
    companyId: string,
    query: QueryRefundDto,
  ): Promise<{ items: RefundResponseDto[]; total: number; page: number; limit: number }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);
      const skip = (page - 1) * limit;

      const where: Prisma.RefundWhereInput = {
        companyId,
        ...(query.bookingId ? { bookingId: query.bookingId } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.status ? { status: query.status } : {}),
      };

      const [records, total] = await Promise.all([
        tx.refund.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.refund.count({ where }),
      ]);

      return {
        items: records.map((r) => toRefundResponseDto(r)),
        total,
        page,
        limit,
      };
    });
  }
}
