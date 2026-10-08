import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { GOODS_RECEIPT_STATUS, PURCHASE_ORDER_STATUS } from '../domain/procurement.constants.js';
import { calculateGrnLines } from '../domain/procurement.helpers.js';
import type { CreateGoodsReceiptDto, ProcurementQueryDto } from '../dto/index.js';

@Injectable()
export class GoodsReceiptService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
  ) {}

  private async generateGrnNumber(tx: TenantPrisma): Promise<string> {
    const fiscalYear = new Date().getFullYear().toString();
    const seq = await this.sequenceService.next(tx, {
      type: 'GOODS_RECEIPT',
      fiscalYear,
    });
    return this.sequenceService.format({
      prefix: 'GRN',
      fiscalYear,
      value: seq,
      padding: 6,
    });
  }

  async create(companyId: string, userId: string, dto: CreateGoodsReceiptDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new AppException(
        ERROR_CODES.VALIDATION_ERROR,
        'Goods receipt note must contain at least one line item',
        {},
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.tenantDb.transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id: dto.poId, companyId, deletedAt: null },
        include: { lines: true },
      });

      if (!po) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Purchase order not found',
          { poId: dto.poId },
          HttpStatus.NOT_FOUND,
        );
      }

      if (
        po.status === PURCHASE_ORDER_STATUS.CLOSED ||
        po.status === PURCHASE_ORDER_STATUS.CANCELLED
      ) {
        throw new AppException(
          ERROR_CODES.CONFLICT,
          'Cannot receive goods for closed or cancelled PO',
          { status: po.status },
          HttpStatus.CONFLICT,
        );
      }

      const grnNumber = await this.generateGrnNumber(tx);
      const { computedLines, totalAmountPaisa } = calculateGrnLines(dto.lines);

      const grn = await tx.goodsReceipt.create({
        data: {
          companyId,
          grnNumber,
          poId: dto.poId,
          vendorId: po.vendorId,
          projectId: po.projectId,
          receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : new Date(),
          challanNumber: dto.challanNumber,
          status: GOODS_RECEIPT_STATUS.RECEIVED,
          receivedById: userId,
          totalAmountPaisa,
          notes: dto.notes,
          lines: {
            create: computedLines.map((l) => ({
              companyId,
              poLineId: l.poLineId,
              itemDescription: l.itemDescription,
              receivedQuantity: l.receivedQuantity,
              acceptedQuantity: l.acceptedQuantity,
              rejectedQuantity: l.rejectedQuantity,
              unit: l.unit,
              unitPricePaisa: l.unitPricePaisa,
              totalAmountPaisa: l.totalAmountPaisa,
              rejectionReason: l.rejectionReason,
              notes: l.notes,
            })),
          },
        },
        include: { lines: true },
      });

      // Update PO Lines received quantities
      for (const line of computedLines) {
        if (line.poLineId) {
          const accepted = parseFloat(line.acceptedQuantity) || 0;
          await tx.purchaseOrderLine.update({
            where: { id: line.poLineId },
            data: {
              receivedQuantity: { increment: accepted },
            },
          });
        }
      }

      // Re-fetch PO lines to determine overall status
      const updatedPoLines = await tx.purchaseOrderLine.findMany({
        where: { poId: po.id, companyId },
      });

      const allReceived = updatedPoLines.every(
        (l) => Number(l.receivedQuantity) >= Number(l.quantity),
      );
      const newPoStatus = allReceived
        ? PURCHASE_ORDER_STATUS.RECEIVED
        : PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED;

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: newPoStatus,
          receivedAmountPaisa: { increment: totalAmountPaisa },
        },
      });

      await this.auditService.record(tx, {
        action: 'GOODS_RECEIPT_CREATED',
        module: 'procurement',
        recordType: 'GoodsReceipt',
        recordId: grn.id,
        after: {
          grnNumber,
          poId: dto.poId,
          totalAmountPaisa: totalAmountPaisa.toString(),
          receivedById: userId,
        },
      });

      return grn;
    });
  }

  async findAll(companyId: string, query: ProcurementQueryDto) {
    return this.tenantDb.withCompany(companyId, async (db) => {
      const where: import('@prisma/client').Prisma.GoodsReceiptWhereInput = {
        companyId,
        deletedAt: null,
      };

      if (query.projectId) where.projectId = query.projectId;
      if (query.vendorId) where.vendorId = query.vendorId;
      if (query.status) where.status = query.status;
      if (query.search) {
        where.OR = [
          { grnNumber: { contains: query.search, mode: 'insensitive' } },
          { challanNumber: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        db.goodsReceipt.findMany({
          where,
          include: {
            vendor: { select: { id: true, name: true, vendorNumber: true } },
            purchaseOrder: { select: { id: true, poNumber: true, status: true } },
            lines: true,
            _count: { select: { bills: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          skip: query.offset,
        }),
        db.goodsReceipt.count({ where }),
      ]);

      return { items, total, limit: query.limit, offset: query.offset };
    });
  }

  async findById(companyId: string, id: string) {
    return this.tenantDb.withCompany(companyId, async (db) => {
      const grn = await db.goodsReceipt.findFirst({
        where: { id, companyId, deletedAt: null },
        include: {
          vendor: true,
          purchaseOrder: {
            include: { lines: true },
          },
          lines: true,
          bills: true,
        },
      });

      if (!grn) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Goods receipt not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      return grn;
    });
  }

  async createBillFromGrn(companyId: string, userId: string, id: string) {
    return this.tenantDb.transaction(async (tx) => {
      const grn = await tx.goodsReceipt.findFirst({
        where: { id, companyId, deletedAt: null },
        include: { lines: true, bills: true },
      });

      if (!grn) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Goods receipt not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      if (grn.bills.length > 0) {
        throw new AppException(
          ERROR_CODES.CONFLICT,
          'A vendor bill has already been created for this Goods Receipt',
          { existingBillId: grn.bills[0]?.id },
          HttpStatus.CONFLICT,
        );
      }

      const fiscalYear = new Date().getFullYear().toString();
      const billSeq = await this.sequenceService.next(tx, { type: 'VENDOR_BILL', fiscalYear });
      const billNumber = this.sequenceService.format({
        prefix: 'BILL',
        fiscalYear,
        value: billSeq,
        padding: 6,
      });

      const bill = await tx.vendorBill.create({
        data: {
          companyId,
          billNumber,
          vendorId: grn.vendorId,
          projectId: grn.projectId,
          poId: grn.poId,
          grnId: grn.id,
          billDate: new Date(),
          totalAmountPaisa: grn.totalAmountPaisa,
          netPayablePaisa: grn.totalAmountPaisa,
          status: 'DRAFT',
          notes: `Created from Goods Receipt ${grn.grnNumber}${grn.challanNumber ? ` (Challan: ${grn.challanNumber})` : ''}`,
          lines: {
            create: grn.lines.map((l) => ({
              companyId,
              accountCode: '1210', // Development WIP per accounting-rules.md §3.6
              description: `${l.itemDescription} (${l.acceptedQuantity} ${l.unit})`,
              amountPaisa: l.totalAmountPaisa,
              projectId: grn.projectId,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.purchaseOrder.update({
        where: { id: grn.poId },
        data: {
          billedAmountPaisa: { increment: grn.totalAmountPaisa },
        },
      });

      await this.auditService.record(tx, {
        action: 'VENDOR_BILL_CREATED_FROM_GRN',
        module: 'procurement',
        recordType: 'VendorBill',
        recordId: bill.id,
        after: { billNumber, grnId: id, grnNumber: grn.grnNumber, createdById: userId },
      });

      return bill;
    });
  }
}
