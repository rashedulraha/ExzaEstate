import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_CODES, formatMoney } from '@exzaestate/shared';
import type { Prisma } from '@prisma/client';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { generateInstallmentItems } from './domain/schedule-generator.js';
import { toInstallmentResponseDto } from './installment.mapper.js';
import type {
  GenerateScheduleDto,
  InstallmentResponseDto,
  InstallmentScheduleSummaryDto,
  QueryInstallmentsDto,
} from './dto/index.js';

@Injectable()
export class InstallmentService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
  ) {}

  async createScheduleForBooking(
    companyId: string,
    dto: GenerateScheduleDto,
    userId?: string,
  ): Promise<InstallmentScheduleSummaryDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: dto.bookingId, companyId },
      });

      if (!booking) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Booking with ID ${dto.bookingId} not found`,
        });
      }

      const existingCount = await tx.installment.count({
        where: { bookingId: dto.bookingId, companyId },
      });

      if (existingCount > 0) {
        const hasPayments = await tx.payment.count({
          where: { bookingId: dto.bookingId, companyId, isDraft: false },
        });

        if (hasPayments > 0) {
          throw new BadRequestException({
            code: ERROR_CODES.INVALID_STATE_TRANSITION,
            message: 'Cannot regenerate schedule for a booking with active posted payments',
          });
        }

        // Delete prior unscheduled drafts
        await tx.installment.deleteMany({
          where: { bookingId: dto.bookingId, companyId },
        });
      }

      const items = generateInstallmentItems({
        netPricePaisa: booking.netPricePaisa,
        bookingAmountPaisa: booking.bookingAmountPaisa,
        downPaymentPaisa: booking.downPaymentPaisa,
        installmentCount: dto.installmentCount,
        firstDueDate: dto.firstDueDate,
        frequency: dto.frequency,
        customMilestones: dto.customMilestones,
      });

      for (const item of items) {
        await tx.installment.create({
          data: {
            companyId,
            bookingId: dto.bookingId,
            installmentNumber: item.installmentNumber,
            name: item.name,
            type: item.type,
            dueDate: new Date(item.dueDate),
            amountPaisa: item.amountPaisa,
            paidAmountPaisa: 0n,
            remainingAmountPaisa: item.amountPaisa,
            paymentState: 'Unpaid',
            milestoneEvent: item.milestoneEvent,
            createdById: userId,
          },
        });
      }

      await this.auditService.record(tx, {
        action: 'INSTALLMENT_SCHEDULE_CREATED',
        module: 'collection',
        recordType: 'booking',
        recordId: dto.bookingId,
        after: {
          installmentCount: items.length,
          firstDueDate: dto.firstDueDate,
          frequency: dto.frequency,
        },
      });

      return this.fetchSummary(tx, companyId, dto.bookingId);
    });
  }

  async findByBookingId(
    companyId: string,
    bookingId: string,
    referenceDate?: string,
  ): Promise<InstallmentScheduleSummaryDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      return this.fetchSummary(tx, companyId, bookingId, referenceDate);
    });
  }

  async findById(
    companyId: string,
    id: string,
    referenceDate?: string,
  ): Promise<InstallmentResponseDto> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const record = await tx.installment.findFirst({
        where: { id, companyId },
      });

      if (!record) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: `Installment with ID ${id} not found`,
        });
      }

      return toInstallmentResponseDto(record, 'Asia/Dhaka', referenceDate);
    });
  }

  async query(
    companyId: string,
    dto: QueryInstallmentsDto,
  ): Promise<{ items: InstallmentResponseDto[]; total: number }> {
    return this.tenantDb.withCompany(companyId, async (tx) => {
      const where: Prisma.InstallmentWhereInput = {
        companyId,
        ...(dto.bookingId ? { bookingId: dto.bookingId } : {}),
        ...(dto.paymentState ? { paymentState: dto.paymentState } : {}),
        ...(dto.dueDateFrom || dto.dueDateTo
          ? {
              dueDate: {
                ...(dto.dueDateFrom ? { gte: new Date(dto.dueDateFrom) } : {}),
                ...(dto.dueDateTo ? { lte: new Date(dto.dueDateTo) } : {}),
              },
            }
          : {}),
      };

      const [records, total] = await Promise.all([
        tx.installment.findMany({
          where,
          orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
          take: dto.limit,
          skip: dto.offset,
        }),
        tx.installment.count({ where }),
      ]);

      const mapped = records.map((r) =>
        toInstallmentResponseDto(r, 'Asia/Dhaka', dto.referenceDate),
      );

      const items = dto.timingState
        ? mapped.filter((item) => item.timingState === dto.timingState)
        : mapped;

      return { items, total };
    });
  }

  private async fetchSummary(
    tx: TenantPrisma,
    companyId: string,
    bookingId: string,
    referenceDate?: string,
  ): Promise<InstallmentScheduleSummaryDto> {
    const records = await tx.installment.findMany({
      where: { companyId, bookingId },
      orderBy: { installmentNumber: 'asc' },
    });

    const mapped = records.map((r) => toInstallmentResponseDto(r, 'Asia/Dhaka', referenceDate));

    let totalScheduledPaisa = 0n;
    let totalPaidPaisa = 0n;
    let totalRemainingPaisa = 0n;

    for (const r of records) {
      totalScheduledPaisa += r.amountPaisa;
      totalPaidPaisa += r.paidAmountPaisa;
      totalRemainingPaisa += r.remainingAmountPaisa;
    }

    return {
      bookingId,
      totalInstallments: mapped.length,
      totalScheduledPaisa: totalScheduledPaisa.toString(),
      totalScheduledFormatted: formatMoney(totalScheduledPaisa),
      totalPaidPaisa: totalPaidPaisa.toString(),
      totalPaidFormatted: formatMoney(totalPaidPaisa),
      totalRemainingPaisa: totalRemainingPaisa.toString(),
      totalRemainingFormatted: formatMoney(totalRemainingPaisa),
      items: mapped,
    };
  }
}
