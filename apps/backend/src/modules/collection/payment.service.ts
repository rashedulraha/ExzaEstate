import crypto from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { IdempotencyService } from '../../platform/idempotency/idempotency.service.js';
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
import { PaymentPostingService } from './payment-posting.service.js';
import { mapPaymentToDto } from './payment.mapper.js';

@Injectable()
export class PaymentService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly idempotencyService: IdempotencyService,
    private readonly paymentPostingService: PaymentPostingService,
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

      const created = await tx.payment.create({ data: createData });

      await tx.paymentStatusHistory.create({
        data: {
          companyId,
          paymentId: created.id,
          toStatus: 'Draft',
          reason: dto.notes ?? 'Draft payment created',
          changedById: userId,
        },
      });

      await this.auditService.record(tx, {
        action: 'PAYMENT_DRAFT_CREATED',
        module: 'collection',
        recordType: 'Payment',
        recordId: created.id,
        after: {
          paymentNumber: created.paymentNumber,
          amountPaisa: created.amountPaisa.toString(),
          paymentMethod: created.paymentMethod,
          paymentType: created.paymentType,
        },
      });

      const result = mapPaymentToDto(created);

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
    idempotencyKey?: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentPostingService.postPayment(
      companyId,
      userId,
      paymentId,
      dto,
      idempotencyKey,
    );
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
