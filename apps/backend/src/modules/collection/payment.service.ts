import crypto from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DOMAIN_EVENTS, ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { IdempotencyService } from '../../platform/idempotency/idempotency.service.js';
import { OutboxService } from '../../platform/outbox/outbox.service.js';
import { SequenceService } from '../../platform/sequence/sequence.service.js';
import type {
  CreateDraftPaymentDto,
  PaymentResponseDto,
  PostPaymentDto,
  QueryPaymentsDto,
} from './dto/index.js';
import {
  buildDraftPaymentCreateData,
  validateBookingAndCustomer,
  validatePaymentMethodRequirements,
} from './payment-creator.helper.js';
import { mapPaymentToDto } from './payment.mapper.js';

@Injectable()
export class PaymentService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async createDraftPayment(
    companyId: string,
    userId: string,
    dto: CreateDraftPaymentDto,
    idempotencyKey?: string,
  ): Promise<PaymentResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      if (idempotencyKey) {
        const requestHash = crypto.createHash('sha256').update(JSON.stringify(dto)).digest('hex');
        const idem = await this.idempotencyService.begin(tx, {
          key: idempotencyKey,
          requestHash,
          method: 'POST',
          routePattern: '/api/v1/collection/payments/draft',
          userId,
        });
        if (idem.replayed && idem.body) {
          return idem.body as PaymentResponseDto;
        }
      }

      validatePaymentMethodRequirements(dto);
      const { propertyId, projectId } = await validateBookingAndCustomer(tx, companyId, dto);

      const fiscalYear = new Date().getFullYear().toString();
      const seqVal = await this.sequenceService.next(tx, {
        type: 'PAYMENT',
        fiscalYear,
      });
      const paymentNumber = this.sequenceService.format({
        prefix: 'PAY',
        fiscalYear,
        value: seqVal,
        padding: 5,
      });

      const createData = buildDraftPaymentCreateData(
        companyId,
        userId,
        paymentNumber,
        dto,
        propertyId,
        projectId,
      );

      const payment = await tx.payment.create({ data: createData });

      await tx.paymentStatusHistory.create({
        data: {
          companyId,
          paymentId: payment.id,
          fromStatus: null,
          toStatus: 'Draft',
          reason: 'Draft payment created',
          changedById: userId,
        },
      });

      await this.auditService.record(tx, {
        action: 'PAYMENT_DRAFT_CREATED',
        module: 'collection',
        recordType: 'Payment',
        recordId: payment.id,
        after: {
          paymentNumber,
          status: 'Draft',
          amountPaisa: dto.amountPaisa,
          paymentMethod: dto.paymentMethod,
          bookingId: dto.bookingId ?? null,
          customerId: dto.customerId,
        },
      });

      await this.outboxService.emit(tx, 'payment.draft_created', {
        paymentId: payment.id,
        paymentNumber,
        amountPaisa: dto.amountPaisa,
        bookingId: dto.bookingId ?? null,
        customerId: dto.customerId,
      });

      const result = mapPaymentToDto(payment);

      if (idempotencyKey) {
        await this.idempotencyService.complete(tx, {
          key: idempotencyKey,
          method: 'POST',
          routePattern: '/api/v1/collection/payments/draft',
          status: 201,
          body: result,
          userId,
        });
      }

      return result;
    });
  }

  async postPayment(
    companyId: string,
    userId: string,
    paymentId: string,
    dto: PostPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, companyId },
      });
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

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'Posted',
          isDraft: false,
          postedAt: new Date(),
          postedById: userId,
          notes: dto.notes ?? payment.notes,
        },
      });

      await tx.paymentStatusHistory.create({
        data: {
          companyId,
          paymentId: payment.id,
          fromStatus: payment.status,
          toStatus: 'Posted',
          reason: dto.notes ?? 'Payment posted',
          changedById: userId,
        },
      });

      await this.auditService.record(tx, {
        action: 'PAYMENT_POSTED',
        module: 'collection',
        recordType: 'Payment',
        recordId: payment.id,
        before: { status: payment.status },
        after: { status: 'Posted', postedAt: new Date().toISOString() },
      });

      await this.outboxService.emit(tx, DOMAIN_EVENTS.PAYMENT_POSTED, {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        amountPaisa: payment.amountPaisa.toString(),
        bookingId: payment.bookingId,
        customerId: payment.customerId,
      });

      return mapPaymentToDto(updated);
    });
  }

  async getPaymentById(companyId: string, paymentId: string): Promise<PaymentResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, companyId },
      });
      if (!payment) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Payment with ID "${paymentId}" not found.`,
        });
      }
      return mapPaymentToDto(payment);
    });
  }

  async listPayments(
    companyId: string,
    query: QueryPaymentsDto,
  ): Promise<{ items: PaymentResponseDto[]; total: number; page: number; limit: number }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const page = Number(query.page ?? 1);
      const limit = Number(query.limit ?? 20);
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { companyId };
      if (query.status) where.status = query.status;
      if (query.bookingId) where.bookingId = query.bookingId;
      if (query.customerId) where.customerId = query.customerId;
      if (query.paymentType) where.paymentType = query.paymentType;
      if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
      if (query.search) {
        where.paymentNumber = { contains: query.search.trim(), mode: 'insensitive' };
      }

      const [payments, total] = await Promise.all([
        tx.payment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.payment.count({ where }),
      ]);

      return {
        items: payments.map(mapPaymentToDto),
        total,
        page,
        limit,
      };
    });
  }
}
