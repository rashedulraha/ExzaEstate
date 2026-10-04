import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PostingService } from '../../accounting/posting/posting.service.js';
import { VENDOR_BILL_STATUS } from '../domain/procurement.constants.js';
import type { CreateVendorBillDto } from '../dto/index.js';

@Injectable()
export class VendorBillService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly postingService: PostingService,
  ) {}

  private async generateBillNumber(tx: TenantPrisma): Promise<string> {
    const fiscalYear = new Date().getFullYear().toString();
    const seq = await this.sequenceService.next(tx, {
      type: 'VENDOR_BILL',
      fiscalYear,
    });
    return this.sequenceService.format({
      prefix: 'BILL',
      fiscalYear,
      value: seq,
      padding: 6,
    });
  }

  async createBill(
    companyId: string,
    userId: string,
    dto: CreateVendorBillDto,
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

      if (!dto.lines || dto.lines.length === 0) {
        throw new AppException(
          ERROR_CODES.VALIDATION_ERROR,
          'Vendor bill must contain at least one charge line',
          {},
          HttpStatus.BAD_REQUEST,
        );
      }

      let totalAmountPaisa = 0n;
      for (const line of dto.lines) {
        const amt = BigInt(line.amountPaisa);
        if (amt <= 0n) {
          throw new AppException(
            ERROR_CODES.VALIDATION_ERROR,
            'Line amount must be greater than zero',
            { lineAmount: line.amountPaisa },
            HttpStatus.BAD_REQUEST,
          );
        }
        totalAmountPaisa += amt;
      }

      const taxWithholdingPaisa = dto.taxWithholdingPaisa ? BigInt(dto.taxWithholdingPaisa) : 0n;
      const vatWithholdingPaisa = dto.vatWithholdingPaisa ? BigInt(dto.vatWithholdingPaisa) : 0n;
      const netPayablePaisa = totalAmountPaisa - taxWithholdingPaisa - vatWithholdingPaisa;

      const billNumber = await this.generateBillNumber(db);
      const billDate = dto.billDate ? new Date(dto.billDate) : new Date();
      const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

      const bill = await db.vendorBill.create({
        data: {
          companyId,
          billNumber,
          vendorId: dto.vendorId,
          projectId: dto.projectId,
          billDate,
          dueDate,
          totalAmountPaisa,
          taxWithholdingPaisa,
          vatWithholdingPaisa,
          netPayablePaisa,
          status: VENDOR_BILL_STATUS.DRAFT,
          notes: dto.notes,
          lines: {
            create: dto.lines.map((l) => ({
              companyId,
              accountCode: l.accountCode,
              description: l.description,
              amountPaisa: BigInt(l.amountPaisa),
              costCenter: l.costCenter,
              projectId: l.projectId ?? dto.projectId,
            })),
          },
        },
        include: { lines: true, vendor: true },
      });

      // Update vendor balance
      await db.vendor.update({
        where: { id: dto.vendorId },
        data: {
          totalBilledPaisa: { increment: netPayablePaisa },
          outstandingPaisa: { increment: netPayablePaisa },
        },
      });

      if (dto.postImmediately !== false) {
        return this.postBill(companyId, userId, bill.id, db);
      }

      await this.auditService.record(db, {
        action: 'VENDOR_BILL_CREATED',
        module: 'procurement',
        recordType: 'VendorBill',
        recordId: bill.id,
        after: {
          billNumber: bill.billNumber,
          netPayablePaisa: bill.netPayablePaisa.toString(),
          createdById: userId,
        },
      });

      return bill;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async postBill(companyId: string, userId: string, billId: string, tx?: TenantPrisma) {
    const runner = async (db: TenantPrisma) => {
      const bill = await db.vendorBill.findFirst({
        where: { id: billId, companyId, deletedAt: null },
        include: { lines: true, vendor: true },
      });

      if (!bill) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          `Vendor bill not found: ${billId}`,
          { billId },
          HttpStatus.NOT_FOUND,
        );
      }

      if (bill.status !== VENDOR_BILL_STATUS.DRAFT) {
        throw new AppException(
          ERROR_CODES.INVALID_STATE_TRANSITION,
          `Only DRAFT vendor bills can be posted (current: ${bill.status})`,
          { currentStatus: bill.status },
          HttpStatus.BAD_REQUEST,
        );
      }

      const primaryLine = bill.lines[0];
      const postingPayload = {
        billId: bill.id,
        vendorId: bill.vendorId,
        amountPaisa: bill.netPayablePaisa.toString(),
        debitAccountCode: primaryLine?.accountCode ?? '1210',
        description: bill.notes ?? `Vendor bill ${bill.billNumber}`,
        reference: bill.billNumber,
        projectId: bill.projectId ?? primaryLine?.projectId ?? undefined,
        costCenter: primaryLine?.costCenter ?? undefined,
        postingDate: bill.billDate.toISOString(),
      };

      const journals = await this.postingService.post(
        companyId,
        userId,
        'VENDOR_BILL_POSTED',
        postingPayload,
        db,
      );

      const journalId = journals[0]?.id ?? null;

      const updated = await db.vendorBill.update({
        where: { id: billId },
        data: {
          status: VENDOR_BILL_STATUS.POSTED,
          journalId,
        },
        include: { lines: true, vendor: true },
      });

      await this.auditService.record(db, {
        action: 'VENDOR_BILL_POSTED',
        module: 'procurement',
        recordType: 'VendorBill',
        recordId: billId,
        after: {
          status: updated.status,
          journalId,
          postedById: userId,
          amountPaisa: bill.netPayablePaisa.toString(),
        },
      });

      return updated;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }

  async getBillById(companyId: string, billId: string, tx?: TenantPrisma) {
    const runner = async (db: TenantPrisma) => {
      const bill = await db.vendorBill.findFirst({
        where: { id: billId, companyId, deletedAt: null },
        include: { lines: true, vendor: true, allocations: true },
      });

      if (!bill) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          `Vendor bill not found: ${billId}`,
          { billId },
          HttpStatus.NOT_FOUND,
        );
      }

      return bill;
    };

    return tx ? runner(tx) : this.tenantDb.withCompany(companyId, runner);
  }
}
