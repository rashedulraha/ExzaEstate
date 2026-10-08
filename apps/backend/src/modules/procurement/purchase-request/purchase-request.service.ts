import { HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { AuditService } from '../../../platform/audit/audit.service.js';
import { SequenceService } from '../../../platform/sequence/sequence.service.js';
import { PURCHASE_REQUEST_STATUS } from '../domain/procurement.constants.js';
import { calculatePrLines } from '../domain/procurement.helpers.js';
import type {
  CreatePurchaseRequestDto,
  UpdatePurchaseRequestDto,
  ProcurementQueryDto,
  ConvertPrToPoDto,
} from '../dto/index.js';

@Injectable()
export class PurchaseRequestService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
  ) {}

  private async generatePrNumber(tx: TenantPrisma): Promise<string> {
    const fiscalYear = new Date().getFullYear().toString();
    const seq = await this.sequenceService.next(tx, {
      type: 'PURCHASE_REQUEST',
      fiscalYear,
    });
    return this.sequenceService.format({
      prefix: 'PR',
      fiscalYear,
      value: seq,
      padding: 6,
    });
  }

  async create(companyId: string, userId: string, dto: CreatePurchaseRequestDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new AppException(
        ERROR_CODES.VALIDATION_ERROR,
        'Purchase request must have at least one line item',
        {},
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.tenantDb.transaction(async (tx) => {
      const prNumber = await this.generatePrNumber(tx);
      const { computedLines, totalEstimatedPaisa } = calculatePrLines(dto.lines);

      const pr = await tx.purchaseRequest.create({
        data: {
          companyId,
          prNumber,
          title: dto.title,
          projectId: dto.projectId,
          department: dto.department,
          requestedById: userId,
          requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : undefined,
          priority: dto.priority ?? 'MEDIUM',
          status: PURCHASE_REQUEST_STATUS.DRAFT,
          totalEstimatedPaisa,
          notes: dto.notes,
          lines: {
            create: computedLines.map((l) => ({
              companyId,
              itemDescription: l.itemDescription,
              category: l.category,
              quantity: l.quantity,
              unit: l.unit,
              estimatedUnitPricePaisa: l.estimatedUnitPricePaisa,
              estimatedAmountPaisa: l.estimatedAmountPaisa,
              notes: l.notes,
            })),
          },
        },
        include: { lines: true },
      });

      await this.auditService.record(tx, {
        action: 'PURCHASE_REQUEST_CREATED',
        module: 'procurement',
        recordType: 'PurchaseRequest',
        recordId: pr.id,
        after: {
          prNumber,
          totalEstimatedPaisa: totalEstimatedPaisa.toString(),
          createdById: userId,
        },
      });

      return pr;
    });
  }

  async findAll(companyId: string, query: ProcurementQueryDto) {
    return this.tenantDb.withCompany(companyId, async (db) => {
      const where: import('@prisma/client').Prisma.PurchaseRequestWhereInput = {
        companyId,
        deletedAt: null,
      };

      if (query.projectId) where.projectId = query.projectId;
      if (query.status) where.status = query.status;
      if (query.search) {
        where.OR = [
          { prNumber: { contains: query.search, mode: 'insensitive' } },
          { title: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        db.purchaseRequest.findMany({
          where,
          include: { lines: true },
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          skip: query.offset,
        }),
        db.purchaseRequest.count({ where }),
      ]);

      return { items, total, limit: query.limit, offset: query.offset };
    });
  }

  async findById(companyId: string, id: string) {
    return this.tenantDb.withCompany(companyId, async (db) => {
      const pr = await db.purchaseRequest.findFirst({
        where: { id, companyId, deletedAt: null },
        include: {
          lines: true,
          purchaseOrders: {
            select: { id: true, poNumber: true, status: true, totalAmountPaisa: true },
          },
        },
      });

      if (!pr) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Purchase request not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      return pr;
    });
  }

  async update(companyId: string, userId: string, id: string, dto: UpdatePurchaseRequestDto) {
    return this.tenantDb.transaction(async (tx) => {
      const pr = await tx.purchaseRequest.findFirst({
        where: { id, companyId, deletedAt: null },
      });

      if (!pr) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Purchase request not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      if (pr.status !== PURCHASE_REQUEST_STATUS.DRAFT) {
        throw new AppException(
          ERROR_CODES.CONFLICT,
          'Only draft purchase requests can be edited',
          { status: pr.status },
          HttpStatus.CONFLICT,
        );
      }

      const updateData: import('@prisma/client').Prisma.PurchaseRequestUpdateInput = {};
      if (dto.title) updateData.title = dto.title;
      if (dto.projectId !== undefined) updateData.projectId = dto.projectId;
      if (dto.department !== undefined) updateData.department = dto.department;
      if (dto.requiredDate) updateData.requiredDate = new Date(dto.requiredDate);
      if (dto.priority) updateData.priority = dto.priority;
      if (dto.notes !== undefined) updateData.notes = dto.notes;

      if (dto.lines && dto.lines.length > 0) {
        await tx.purchaseRequestLine.deleteMany({ where: { prId: id, companyId } });
        const { computedLines, totalEstimatedPaisa } = calculatePrLines(dto.lines);
        updateData.totalEstimatedPaisa = totalEstimatedPaisa;

        await tx.purchaseRequestLine.createMany({
          data: computedLines.map((l) => ({
            companyId,
            prId: id,
            itemDescription: l.itemDescription,
            category: l.category,
            quantity: l.quantity,
            unit: l.unit,
            estimatedUnitPricePaisa: l.estimatedUnitPricePaisa,
            estimatedAmountPaisa: l.estimatedAmountPaisa,
            notes: l.notes,
          })),
        });
      }

      const updated = await tx.purchaseRequest.update({
        where: { id },
        data: updateData,
        include: { lines: true },
      });

      await this.auditService.record(tx, {
        action: 'PURCHASE_REQUEST_UPDATED',
        module: 'procurement',
        recordType: 'PurchaseRequest',
        recordId: id,
        after: { updatedById: userId },
      });

      return updated;
    });
  }

  async submit(companyId: string, userId: string, id: string) {
    return this.tenantDb.transaction(async (tx) => {
      const pr = await tx.purchaseRequest.findFirst({ where: { id, companyId, deletedAt: null } });
      if (!pr) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Purchase request not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      if (pr.status !== PURCHASE_REQUEST_STATUS.DRAFT) {
        throw new AppException(
          ERROR_CODES.CONFLICT,
          'Only draft PR can be submitted',
          { status: pr.status },
          HttpStatus.CONFLICT,
        );
      }

      const updated = await tx.purchaseRequest.update({
        where: { id },
        data: { status: PURCHASE_REQUEST_STATUS.PENDING_APPROVAL },
        include: { lines: true },
      });

      await this.auditService.record(tx, {
        action: 'PURCHASE_REQUEST_SUBMITTED',
        module: 'procurement',
        recordType: 'PurchaseRequest',
        recordId: id,
        after: { status: PURCHASE_REQUEST_STATUS.PENDING_APPROVAL, submittedById: userId },
      });

      return updated;
    });
  }

  async approve(companyId: string, userId: string, id: string) {
    return this.tenantDb.transaction(async (tx) => {
      const pr = await tx.purchaseRequest.findFirst({ where: { id, companyId, deletedAt: null } });
      if (!pr) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Purchase request not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      if (
        pr.status !== PURCHASE_REQUEST_STATUS.PENDING_APPROVAL &&
        pr.status !== PURCHASE_REQUEST_STATUS.DRAFT
      ) {
        throw new AppException(
          ERROR_CODES.CONFLICT,
          'PR is not awaiting approval',
          { status: pr.status },
          HttpStatus.CONFLICT,
        );
      }

      const updated = await tx.purchaseRequest.update({
        where: { id },
        data: {
          status: PURCHASE_REQUEST_STATUS.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
        },
        include: { lines: true },
      });

      await this.auditService.record(tx, {
        action: 'PURCHASE_REQUEST_APPROVED',
        module: 'procurement',
        recordType: 'PurchaseRequest',
        recordId: id,
        after: { status: PURCHASE_REQUEST_STATUS.APPROVED, approvedById: userId },
      });

      return updated;
    });
  }

  async reject(companyId: string, userId: string, id: string, reason: string) {
    return this.tenantDb.transaction(async (tx) => {
      const pr = await tx.purchaseRequest.findFirst({ where: { id, companyId, deletedAt: null } });
      if (!pr) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Purchase request not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      const updated = await tx.purchaseRequest.update({
        where: { id },
        data: {
          status: PURCHASE_REQUEST_STATUS.REJECTED,
          rejectionReason: reason,
        },
        include: { lines: true },
      });

      await this.auditService.record(tx, {
        action: 'PURCHASE_REQUEST_REJECTED',
        module: 'procurement',
        recordType: 'PurchaseRequest',
        recordId: id,
        reason,
        after: { status: PURCHASE_REQUEST_STATUS.REJECTED, rejectedById: userId },
      });

      return updated;
    });
  }

  async convertToPo(companyId: string, userId: string, id: string, dto: ConvertPrToPoDto) {
    return this.tenantDb.transaction(async (tx) => {
      const pr = await tx.purchaseRequest.findFirst({
        where: { id, companyId, deletedAt: null },
        include: { lines: true },
      });

      if (!pr) {
        throw new AppException(
          ERROR_CODES.NOT_FOUND,
          'Purchase request not found',
          { id },
          HttpStatus.NOT_FOUND,
        );
      }

      if (pr.status !== PURCHASE_REQUEST_STATUS.APPROVED) {
        throw new AppException(
          ERROR_CODES.CONFLICT,
          'Only approved purchase requests can be converted to a PO',
          { status: pr.status },
          HttpStatus.CONFLICT,
        );
      }

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

      const fiscalYear = new Date().getFullYear().toString();
      const poSeq = await this.sequenceService.next(tx, { type: 'PURCHASE_ORDER', fiscalYear });
      const poNumber = this.sequenceService.format({
        prefix: 'PO',
        fiscalYear,
        value: poSeq,
        padding: 6,
      });

      const po = await tx.purchaseOrder.create({
        data: {
          companyId,
          poNumber,
          prId: pr.id,
          vendorId: dto.vendorId,
          projectId: pr.projectId,
          expectedDeliveryDate: dto.expectedDeliveryDate
            ? new Date(dto.expectedDeliveryDate)
            : undefined,
          deliveryAddress: dto.deliveryAddress,
          termsAndConditions: dto.termsAndConditions,
          notes: dto.notes ?? pr.notes,
          status: 'ORDERED',
          totalAmountPaisa: pr.totalEstimatedPaisa,
          lines: {
            create: pr.lines.map((l) => ({
              companyId,
              prLineId: l.id,
              itemDescription: l.itemDescription,
              category: l.category,
              quantity: l.quantity,
              unit: l.unit,
              unitPricePaisa: l.estimatedUnitPricePaisa,
              totalAmountPaisa: l.estimatedAmountPaisa,
              notes: l.notes,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.purchaseRequest.update({
        where: { id },
        data: { status: PURCHASE_REQUEST_STATUS.CONVERTED_TO_PO },
      });

      await this.auditService.record(tx, {
        action: 'PURCHASE_REQUEST_CONVERTED_TO_PO',
        module: 'procurement',
        recordType: 'PurchaseRequest',
        recordId: id,
        after: { poId: po.id, poNumber, convertedById: userId },
      });

      return po;
    });
  }
}
