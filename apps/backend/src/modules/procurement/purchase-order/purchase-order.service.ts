import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PURCHASE_ORDER_STATUS } from '../domain/procurement.constants.js';
import { calculatePoLines } from '../domain/procurement.helpers.js';
import type {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ProcurementQueryDto,
} from '../dto/index.js';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
  ) {}

  private async generatePoNumber(tx: TenantPrisma): Promise<string> {
    const fiscalYear = new Date().getFullYear().toString();
    const seq = await this.sequenceService.next(tx, {
      type: 'PURCHASE_ORDER',
      fiscalYear,
    });
    return this.sequenceService.format({
      prefix: 'PO',
      fiscalYear,
      value: seq,
      padding: 6,
    });
  }

  async create(companyId: string, userId: string, dto: CreatePurchaseOrderDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new AppException(
        ERROR_CODES.VALIDATION_ERROR,
        'Purchase order must contain at least one line item',
        {},
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.tenantDb.transaction(async (tx) => {
      const vendor = await tx.vendor.findFirst({
        where: { id: dto.vendorId, companyId, deletedAt: null },
      });

      if (!vendor) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Vendor not found',
          { vendorId: dto.vendorId },
          HttpStatus.NOT_FOUND,
        );
      }

      const poNumber = await this.generatePoNumber(tx);
      const { computedLines, totalAmountPaisa } = calculatePoLines(dto.lines);

      const po = await tx.purchaseOrder.create({
        data: {
          companyId,
          poNumber,
          prId: dto.prId,
          vendorId: dto.vendorId,
          projectId: dto.projectId,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
          expectedDeliveryDate: dto.expectedDeliveryDate
            ? new Date(dto.expectedDeliveryDate)
            : undefined,
          deliveryAddress: dto.deliveryAddress,
          termsAndConditions: dto.termsAndConditions,
          notes: dto.notes,
          status: PURCHASE_ORDER_STATUS.ORDERED,
          totalAmountPaisa,
          lines: {
            create: computedLines.map((l) => ({
              companyId,
              prLineId: l.prLineId,
              itemDescription: l.itemDescription,
              category: l.category,
              quantity: l.quantity,
              unit: l.unit,
              unitPricePaisa: l.unitPricePaisa,
              totalAmountPaisa: l.totalAmountPaisa,
              notes: l.notes,
            })),
          },
        },
        include: { lines: true, vendor: true },
      });

      await this.auditService.record(tx, {
        action: 'PURCHASE_ORDER_CREATED',
        module: 'procurement',
        recordType: 'PurchaseOrder',
        recordId: po.id,
        after: {
          poNumber,
          vendorId: dto.vendorId,
          totalAmountPaisa: totalAmountPaisa.toString(),
          createdById: userId,
        },
      });

      return po;
    });
  }

  async findAll(companyId: string, query: ProcurementQueryDto) {
    return this.tenantDb.withCompany(companyId, async (db) => {
      const where: import('@prisma/client').Prisma.PurchaseOrderWhereInput = {
        companyId,
        deletedAt: null,
      };

      if (query.projectId) where.projectId = query.projectId;
      if (query.vendorId) where.vendorId = query.vendorId;
      if (query.status) where.status = query.status;
      if (query.search) {
        where.OR = [
          { poNumber: { contains: query.search, mode: 'insensitive' } },
          { vendor: { name: { contains: query.search, mode: 'insensitive' } } },
        ];
      }

      const [items, total] = await Promise.all([
        db.purchaseOrder.findMany({
          where,
          include: {
            vendor: { select: { id: true, name: true, vendorNumber: true, phone: true } },
            lines: true,
            _count: { select: { goodsReceipts: true, bills: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          skip: query.offset,
        }),
        db.purchaseOrder.count({ where }),
      ]);

      return { items, total, limit: query.limit, offset: query.offset };
    });
  }

  async findById(companyId: string, id: string) {
    return this.tenantDb.withCompany(companyId, async (db) => {
      const po = await db.purchaseOrder.findFirst({
        where: { id, companyId, deletedAt: null },
        include: {
          vendor: true,
          lines: true,
          goodsReceipts: {
            select: {
              id: true,
              grnNumber: true,
              receiptDate: true,
              status: true,
              totalAmountPaisa: true,
            },
          },
          bills: {
            select: {
              id: true,
              billNumber: true,
              billDate: true,
              netPayablePaisa: true,
              status: true,
            },
          },
          purchaseRequest: {
            select: { id: true, prNumber: true, title: true },
          },
        },
      });

      if (!po) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Purchase order not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      return po;
    });
  }

  async update(companyId: string, userId: string, id: string, dto: UpdatePurchaseOrderDto) {
    return this.tenantDb.transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({ where: { id, companyId, deletedAt: null } });
      if (!po) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Purchase order not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      if (
        po.status === PURCHASE_ORDER_STATUS.CLOSED ||
        po.status === PURCHASE_ORDER_STATUS.CANCELLED
      ) {
        throw new AppException(
          ERROR_CODES.CONFLICT,
          'Closed or cancelled PO cannot be modified',
          { status: po.status },
          HttpStatus.CONFLICT,
        );
      }

      const updateData: import('@prisma/client').Prisma.PurchaseOrderUpdateInput = {};
      if (dto.expectedDeliveryDate)
        updateData.expectedDeliveryDate = new Date(dto.expectedDeliveryDate);
      if (dto.deliveryAddress !== undefined) updateData.deliveryAddress = dto.deliveryAddress;
      if (dto.termsAndConditions !== undefined)
        updateData.termsAndConditions = dto.termsAndConditions;
      if (dto.notes !== undefined) updateData.notes = dto.notes;

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: { lines: true, vendor: true },
      });

      await this.auditService.record(tx, {
        action: 'PURCHASE_ORDER_UPDATED',
        module: 'procurement',
        recordType: 'PurchaseOrder',
        recordId: id,
        after: { updatedById: userId },
      });

      return updated;
    });
  }

  async cancel(companyId: string, userId: string, id: string) {
    return this.tenantDb.transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({ where: { id, companyId, deletedAt: null } });
      if (!po) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Purchase order not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      if (po.receivedAmountPaisa > 0n) {
        throw new AppException(
          ERROR_CODES.CONFLICT,
          'Cannot cancel a purchase order that has already received goods',
          { receivedAmountPaisa: po.receivedAmountPaisa.toString() },
          HttpStatus.CONFLICT,
        );
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: PURCHASE_ORDER_STATUS.CANCELLED },
        include: { lines: true },
      });

      await this.auditService.record(tx, {
        action: 'PURCHASE_ORDER_CANCELLED',
        module: 'procurement',
        recordType: 'PurchaseOrder',
        recordId: id,
        after: { status: PURCHASE_ORDER_STATUS.CANCELLED, cancelledById: userId },
      });

      return updated;
    });
  }

  async close(companyId: string, userId: string, id: string) {
    return this.tenantDb.transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({ where: { id, companyId, deletedAt: null } });
      if (!po) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Purchase order not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: PURCHASE_ORDER_STATUS.CLOSED },
        include: { lines: true },
      });

      await this.auditService.record(tx, {
        action: 'PURCHASE_ORDER_CLOSED',
        module: 'procurement',
        recordType: 'PurchaseOrder',
        recordId: id,
        after: { status: PURCHASE_ORDER_STATUS.CLOSED, closedById: userId },
      });

      return updated;
    });
  }
}
