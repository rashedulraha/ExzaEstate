import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PostingService } from '../../accounting/posting/posting.service.js';
import {
  VENDOR_BILL_STATUS,
  VENDOR_PAYMENT_STATUS,
} from '../domain/procurement.constants.js';
import type { CreateVendorPaymentDto } from '../dto/index.js';

@Injectable()
export class VendorPaymentService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly postingService: PostingService,
  ) {}

  private async generatePaymentNumber(tx: TenantPrisma): Promise<string> {
    const fiscalYear = new Date().getFullYear().toString();
    const seq = await this.sequenceService.next(tx, {
      type: 'VENDOR_PAYMENT',
      fiscalYear,
    });
    return this.sequenceService.format({
      prefix: 'VPAY',
      fiscalYear,
      value: seq,
      padding: 6,
    });
  }

  async createPayment(
    companyId: string,
    userId: string,
    dto: CreateVendorPaymentDto,
    tx?: TenantPrisma,
  ) {
    const runner = async (db: TenantPrisma) => {
      const vendor = await db.vendor.findFirst({
        where: { id: dto.vendorId, companyId, deletedAt: null },
      });

      if (!vendor) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          `Vendor not found: ${dto.vendorId}`,
          { vendorId: dto.vendorId },
          HttpStatus.NOT_FOUND,
        );
      }

      const amountPaisa = BigInt(dto.amountPaisa);
      if (amountPaisa <= 0n) {
        throw new AppException(
          ERROR_CODES.VALIDATION_ERROR,
          'Payment amount must be greater than zero',
          { amountPaisa: dto.amountPaisa },
          HttpStatus.BAD_REQUEST,
        );
      }

      const paymentNumber = await this.generatePaymentNumber(db);
      const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
      const paymentMethod = dto.paymentMethod ?? 'BANK_TRANSFER';
      const bankAccountCode = dto.bankAccountCode ?? (paymentMethod === 'CASH' ? '1010' : '1020');

      const payment = await db.vendorPayment.create({
        data: {
          companyId,
          paymentNumber,
          vendorId: dto.vendorId,
          paymentDate,
          amountPaisa,
          paymentMethod,
          bankAccountId: dto.bankAccountId,
          bankAccountCode,
          reference: dto.reference,
          status: VENDOR_PAYMENT_STATUS.PAID,
          notes: dto.notes,
        },
      });

      // Update bill allocations if provided
      if (dto.allocations && dto.allocations.length > 0) {
        for (const alloc of dto.allocations) {
          const allocAmount = BigInt(alloc.amountPaisa);
          await db.vendorPaymentAllocation.create({
            data: {
              companyId,
              paymentId: payment.id,
              billId: alloc.billId,
              amountPaisa: allocAmount,
            },
          });

          const bill = await db.vendorBill.findUnique({ where: { id: alloc.billId } });
          if (bill) {
            const newPaid = bill.paidAmountPaisa + allocAmount;
            const newStatus =
              newPaid >= bill.netPayablePaisa
                ? VENDOR_BILL_STATUS.PAID
                : VENDOR_BILL_STATUS.PARTIALLY_PAID;

            await db.vendorBill.update({
              where: { id: alloc.billId },
              data: { paidAmountPaisa: newPaid, status: newStatus },
            });
          }
        }
      }

      // Decrement vendor outstanding, increment total paid
      await db.vendor.update({
        where: { id: dto.vendorId },
        data: {
          totalPaidPaisa: { increment: amountPaisa },
          outstandingPaisa: { decrement: amountPaisa },
        },
      });

      // Post VENDOR_PAYMENT journal
      const postingPayload = {
        paymentId: payment.id,
        vendorId: payment.vendorId,
        amountPaisa: payment.amountPaisa.toString(),
        paymentMethod,
        bankAccountCode,
        reference: payment.paymentNumber,
        postingDate: payment.paymentDate.toISOString(),
      };

      const journals = await this.postingService.post(
        companyId,
        userId,
        'VENDOR_PAYMENT',
        postingPayload,
        db,
      );

      const journalId = journals[0]?.id ?? null;
      const updatedPayment = await db.vendorPayment.update({
        where: { id: payment.id },
        data: { journalId },
        include: { vendor: true, allocations: true },
      });

      await this.auditService.record(db, {
        action: 'VENDOR_PAYMENT_POSTED',
        module: 'procurement',
        recordType: 'VendorPayment',
        recordId: payment.id,
        after: {
          paymentNumber: payment.paymentNumber,
          amountPaisa: payment.amountPaisa.toString(),
          journalId,
          paidById: userId,
        },
      });

      return updatedPayment;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }
}
