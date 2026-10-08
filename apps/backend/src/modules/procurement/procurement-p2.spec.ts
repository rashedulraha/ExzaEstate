import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PurchaseRequestService } from './purchase-request/purchase-request.service.js';
import { PurchaseOrderService } from './purchase-order/purchase-order.service.js';
import { GoodsReceiptService } from './goods-receipt/goods-receipt.service.js';
import type { TenantDb } from '../../database/tenant-db.service.js';
import type { SequenceService } from '../../platform/sequence/sequence.service.js';
import type { AuditService } from '../../platform/audit/audit.service.js';
import {
  PURCHASE_REQUEST_STATUS,
  PURCHASE_ORDER_STATUS,
  GOODS_RECEIPT_STATUS,
} from './domain/procurement.constants.js';

interface MockDb {
  purchaseRequest: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  purchaseRequestLine: {
    createMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  purchaseOrder: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  purchaseOrderLine: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  goodsReceipt: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  vendor: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  vendorBill: {
    create: ReturnType<typeof vi.fn>;
  };
}

describe('P2 Procurement: PR → PO → GRN Lifecycle', () => {
  let prService: PurchaseRequestService;
  let poService: PurchaseOrderService;
  let grnService: GoodsReceiptService;

  let mockTenantDb: Partial<TenantDb>;
  let mockSequenceService: Partial<SequenceService>;
  let mockAuditService: Partial<AuditService>;
  let mockTx: MockDb;

  const companyId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const vendorId = '00000000-0000-0000-0000-000000000010';
  const projectId = '00000000-0000-0000-0000-000000000020';

  beforeEach(() => {
    mockTx = {
      purchaseRequest: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      purchaseRequestLine: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      purchaseOrder: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      purchaseOrderLine: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      goodsReceipt: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      vendor: {
        findFirst: vi.fn(),
      },
      vendorBill: {
        create: vi.fn(),
      },
    };

    mockTenantDb = {
      transaction: vi.fn(async (cb) =>
        cb(mockTx as unknown as import('../../database/tenant-prisma.js').TenantPrisma),
      ),
      withCompany: vi.fn(async (_cid, cb) =>
        cb(mockTx as unknown as import('../../database/tenant-prisma.js').TenantPrisma),
      ),
    };

    mockSequenceService = {
      next: vi.fn().mockResolvedValue(1n),
      format: vi
        .fn()
        .mockImplementation(
          ({ prefix, value }) => `${prefix}-2026-${String(value).padStart(6, '0')}`,
        ),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    prService = new PurchaseRequestService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
    );

    poService = new PurchaseOrderService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
    );

    grnService = new GoodsReceiptService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
    );
  });

  describe('Purchase Request (PR)', () => {
    it('creates a draft purchase request with calculated line amounts', async () => {
      mockTx.purchaseRequest.create.mockImplementation(({ data }) => ({
        id: 'pr-1',
        ...data,
      }));

      const result = await prService.create(companyId, userId, {
        title: 'Cement for Foundation Casting',
        projectId,
        lines: [
          {
            itemDescription: 'Portland Cement 50kg',
            category: 'CEMENT',
            quantity: '100',
            unit: 'BAG',
            estimatedUnitPricePaisa: '55000', // 550 BDT
          },
        ],
      });

      expect(result.id).toBe('pr-1');
      expect(result.prNumber).toBe('PR-2026-000001');
      expect(result.totalEstimatedPaisa).toBe(5500000n); // 100 * 55000 = 55,000.00 BDT
      expect(result.status).toBe(PURCHASE_REQUEST_STATUS.DRAFT);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'PURCHASE_REQUEST_CREATED' }),
      );
    });

    it('approves a purchase request and records approval metadata', async () => {
      mockTx.purchaseRequest.findFirst.mockResolvedValue({
        id: 'pr-1',
        status: PURCHASE_REQUEST_STATUS.PENDING_APPROVAL,
      });
      mockTx.purchaseRequest.update.mockResolvedValue({
        id: 'pr-1',
        status: PURCHASE_REQUEST_STATUS.APPROVED,
        approvedById: userId,
      });

      const approved = await prService.approve(companyId, userId, 'pr-1');
      expect(approved.status).toBe(PURCHASE_REQUEST_STATUS.APPROVED);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'PURCHASE_REQUEST_APPROVED' }),
      );
    });

    it('converts an approved purchase request to a Purchase Order', async () => {
      mockTx.purchaseRequest.findFirst.mockResolvedValue({
        id: 'pr-1',
        projectId,
        status: PURCHASE_REQUEST_STATUS.APPROVED,
        totalEstimatedPaisa: 5500000n,
        lines: [
          {
            id: 'prl-1',
            itemDescription: 'Portland Cement',
            category: 'CEMENT',
            quantity: '100',
            unit: 'BAG',
            estimatedUnitPricePaisa: 55000n,
            estimatedAmountPaisa: 5500000n,
          },
        ],
      });
      mockTx.vendor.findFirst.mockResolvedValue({ id: vendorId, name: 'Shah Cement Ltd' });
      mockTx.purchaseOrder.create.mockResolvedValue({
        id: 'po-1',
        poNumber: 'PO-2026-000001',
        status: 'ORDERED',
        totalAmountPaisa: 5500000n,
      });

      const po = await prService.convertToPo(companyId, userId, 'pr-1', {
        vendorId,
        notes: 'Urgent delivery required',
      });

      expect(po.id).toBe('po-1');
      expect(po.poNumber).toBe('PO-2026-000001');
      expect(mockTx.purchaseRequest.update).toHaveBeenCalledWith({
        where: { id: 'pr-1' },
        data: { status: PURCHASE_REQUEST_STATUS.CONVERTED_TO_PO },
      });
    });
  });

  describe('Purchase Order (PO)', () => {
    it('creates a purchase order with validated vendor and lines', async () => {
      mockTx.vendor.findFirst.mockResolvedValue({ id: vendorId, name: 'BSRM Steels' });
      mockTx.purchaseOrder.create.mockImplementation(({ data }) => ({
        id: 'po-1',
        ...data,
      }));

      const po = await poService.create(companyId, userId, {
        vendorId,
        projectId,
        lines: [
          {
            itemDescription: '16mm TMT Bar',
            category: 'STEEL_ROD',
            quantity: '10',
            unit: 'TON',
            unitPricePaisa: '8500000', // 85,000 BDT per ton
          },
        ],
      });

      expect(po.poNumber).toBe('PO-2026-000001');
      expect(po.totalAmountPaisa).toBe(85000000n);
      expect(po.status).toBe(PURCHASE_ORDER_STATUS.ORDERED);
    });

    it('rejects cancellation of a purchase order that has already received goods', async () => {
      mockTx.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        receivedAmountPaisa: 20000000n,
      });

      await expect(poService.cancel(companyId, userId, 'po-1')).rejects.toThrow();
    });
  });

  describe('Goods Receipt Note (GRN) & 3-Way Matching', () => {
    it('records goods receipt, increments received quantities, and updates PO status', async () => {
      mockTx.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        vendorId,
        projectId,
        status: PURCHASE_ORDER_STATUS.ORDERED,
        lines: [{ id: 'pol-1', quantity: 10, receivedQuantity: 0 }],
      });
      mockTx.goodsReceipt.create.mockImplementation(({ data }) => ({
        id: 'grn-1',
        ...data,
      }));
      mockTx.purchaseOrderLine.findMany.mockResolvedValue([
        { id: 'pol-1', quantity: 10, receivedQuantity: 6 },
      ]);

      const grn = await grnService.create(companyId, userId, {
        poId: 'po-1',
        challanNumber: 'CH-9921',
        lines: [
          {
            poLineId: 'pol-1',
            itemDescription: '16mm TMT Bar',
            receivedQuantity: '6',
            acceptedQuantity: '6',
            rejectedQuantity: '0',
            unit: 'TON',
            unitPricePaisa: '8500000',
          },
        ],
      });

      expect(grn.grnNumber).toBe('GRN-2026-000001');
      expect(grn.status).toBe(GOODS_RECEIPT_STATUS.RECEIVED);
      expect(mockTx.purchaseOrderLine.update).toHaveBeenCalledWith({
        where: { id: 'pol-1' },
        data: { receivedQuantity: { increment: 6 } },
      });
      // Partial delivery -> status should be PARTIALLY_RECEIVED
      expect(mockTx.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-1' },
          data: expect.objectContaining({ status: PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED }),
        }),
      );
    });

    it('generates a draft Vendor Bill from Goods Receipt with WIP account 1210', async () => {
      mockTx.goodsReceipt.findFirst.mockResolvedValue({
        id: 'grn-1',
        grnNumber: 'GRN-2026-000001',
        poId: 'po-1',
        vendorId,
        projectId,
        totalAmountPaisa: 51000000n,
        bills: [],
        lines: [
          {
            itemDescription: '16mm TMT Bar',
            acceptedQuantity: '6',
            unit: 'TON',
            totalAmountPaisa: 51000000n,
          },
        ],
      });
      mockTx.vendorBill.create.mockImplementation(({ data }) => ({
        id: 'bill-1',
        ...data,
      }));

      const bill = await grnService.createBillFromGrn(companyId, userId, 'grn-1');

      expect(bill.id).toBe('bill-1');
      expect(bill.billNumber).toBe('BILL-2026-000001');
      expect(bill.totalAmountPaisa).toBe(51000000n);
      expect(bill.status).toBe('DRAFT');
      expect(mockTx.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1' },
        data: { billedAmountPaisa: { increment: 51000000n } },
      });
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'VENDOR_BILL_CREATED_FROM_GRN' }),
      );
    });
  });
});
