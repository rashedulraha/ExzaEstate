import { describe, expect, it, vi, beforeEach } from 'vitest';
import { VendorService } from './vendor/vendor.service.js';
import { VendorBillService } from './bill/vendor-bill.service.js';
import { VendorPaymentService } from './payment/vendor-payment.service.js';
import { VendorApService } from './arap/vendor-ap.service.js';
import { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import type { TenantDb } from '../../database/tenant-db.service.js';
import type { SequenceService } from '../../platform/sequence/sequence.service.js';
import type { AuditService } from '../../platform/audit/audit.service.js';
import type { PostingService } from '../accounting/posting/posting.service.js';
import { VENDOR_BILL_STATUS, VENDOR_PAYMENT_STATUS } from './domain/procurement.constants.js';

interface MockProcurementTx {
  vendor: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  vendorBill: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  vendorPayment: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  vendorPaymentAllocation: {
    create: ReturnType<typeof vi.fn>;
  };
  journalLine: {
    findMany: ReturnType<typeof vi.fn>;
  };
}

describe('Procurement & Vendor AP (A8.2)', () => {
  let vendorService: VendorService;
  let billService: VendorBillService;
  let paymentService: VendorPaymentService;
  let apService: VendorApService;

  let mockTenantDb: Partial<TenantDb>;
  let mockSequenceService: Partial<SequenceService>;
  let mockAuditService: Partial<AuditService>;
  let mockPostingService: Partial<PostingService>;
  let fieldCrypto: FieldCryptoService;
  let mockTx: MockProcurementTx;

  const companyId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const vendorId = '00000000-0000-0000-0000-000000000010';
  const projectId = '00000000-0000-0000-0000-000000000020';

  beforeEach(() => {
    mockTx = {
      vendor: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      vendorBill: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      vendorPayment: {
        create: vi.fn(),
        update: vi.fn(),
      },
      vendorPaymentAllocation: {
        create: vi.fn(),
      },
      journalLine: {
        findMany: vi.fn(),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_cid, cb) =>
        cb(mockTx as unknown as import('../../database/tenant-prisma.js').TenantPrisma),
      ),
    };

    mockSequenceService = {
      next: vi.fn().mockResolvedValue(1),
      format: vi.fn().mockImplementation(({ prefix, value }) => `${prefix}-2026-00000${value}`),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockPostingService = {
      post: vi.fn().mockResolvedValue([{ id: 'journal-v-1', journalNumber: 'JV-2026-000001' }]),
    };

    fieldCrypto = new FieldCryptoService();

    vendorService = new VendorService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      fieldCrypto,
    );

    billService = new VendorBillService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      mockPostingService as PostingService,
    );

    paymentService = new VendorPaymentService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      mockPostingService as PostingService,
    );

    apService = new VendorApService(mockTenantDb as TenantDb);
  });

  describe('S1: Vendor Master with FieldCrypto Encryption', () => {
    it('encrypts bank account number on creation and decrypts on retrieval', async () => {
      const rawBankNo = '1234567890123';
      let storedBankNo: string | undefined;

      mockTx.vendor.create.mockImplementation(({ data }) => {
        storedBankNo = data.bankAccountNumber;
        return Promise.resolve({
          id: vendorId,
          ...data,
          totalBilledPaisa: 0n,
          totalPaidPaisa: 0n,
          outstandingPaisa: 0n,
        });
      });

      const vendor = await vendorService.createVendor(companyId, userId, {
        name: 'Bengal Steel Ltd',
        phone: '01711000000',
        bankName: 'City Bank',
        bankAccountNumber: rawBankNo,
      });

      // Assert encrypted at rest
      expect(storedBankNo).toBeDefined();
      expect(storedBankNo).toMatch(/^enc:v1:/);
      expect(storedBankNo).not.toBe(rawBankNo);

      // Assert decrypted in service output
      expect(vendor.bankAccountNumber).toBe(rawBankNo);
      expect(mockAuditService.record).toHaveBeenCalled();
    });
  });

  describe('S2: Vendor Bills with Lines & VENDOR_BILL_POSTED Posting', () => {
    it('creates vendor bill with development lines and posts VENDOR_BILL_POSTED', async () => {
      mockTx.vendor.findFirst.mockResolvedValue({
        id: vendorId,
        name: 'Bengal Steel Ltd',
      });
      mockTx.vendor.update.mockResolvedValue({});

      mockTx.vendorBill.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'bill-1',
          ...data,
          lines: [
            {
              id: 'line-1',
              accountCode: '1210',
              description: 'M.S. Rod 16mm',
              amountPaisa: 50_000_000n, // ৳5,00,000
            },
          ],
        }),
      );

      mockTx.vendorBill.findFirst.mockResolvedValue({
        id: 'bill-1',
        billNumber: 'BILL-2026-000001',
        vendorId,
        projectId,
        billDate: new Date('2026-10-05'),
        totalAmountPaisa: 50_000_000n,
        netPayablePaisa: 50_000_000n,
        status: VENDOR_BILL_STATUS.DRAFT,
        lines: [
          {
            accountCode: '1210',
            amountPaisa: 50_000_000n,
            costCenter: 'CC-01',
          },
        ],
      });

      mockTx.vendorBill.update.mockResolvedValue({
        id: 'bill-1',
        status: VENDOR_BILL_STATUS.POSTED,
        netPayablePaisa: 50_000_000n,
        journalId: 'journal-v-1',
      });

      const bill = await billService.createBill(companyId, userId, {
        vendorId,
        projectId,
        lines: [
          {
            accountCode: '1210',
            description: 'M.S. Rod 16mm',
            amountPaisa: '50000000',
            costCenter: 'CC-01',
          },
        ],
        postImmediately: true,
      });

      expect(bill.status).toBe(VENDOR_BILL_STATUS.POSTED);
      expect(mockPostingService.post).toHaveBeenCalledWith(
        companyId,
        userId,
        'VENDOR_BILL_POSTED',
        expect.objectContaining({
          billId: 'bill-1',
          vendorId,
          amountPaisa: '50000000',
          debitAccountCode: '1210',
        }),
        expect.anything(),
      );

      // Verify vendor outstanding balance updated
      expect(mockTx.vendor.update).toHaveBeenCalledWith({
        where: { id: vendorId },
        data: {
          totalBilledPaisa: { increment: 50_000_000n },
          outstandingPaisa: { increment: 50_000_000n },
        },
      });
    });
  });

  describe('S3: AP Payments & VENDOR_PAYMENT Posting', () => {
    it('disburses payment to settle bill and updates vendor balances', async () => {
      mockTx.vendor.findFirst.mockResolvedValue({ id: vendorId });
      mockTx.vendorPayment.create.mockResolvedValue({
        id: 'vpay-1',
        paymentNumber: 'VPAY-2026-000001',
        vendorId,
        amountPaisa: 50_000_000n,
        paymentDate: new Date('2026-10-05'),
        paymentMethod: 'BANK_TRANSFER',
        bankAccountCode: '1020',
      });

      mockTx.vendorBill.findUnique.mockResolvedValue({
        id: 'bill-1',
        netPayablePaisa: 50_000_000n,
        paidAmountPaisa: 0n,
      });
      mockTx.vendorBill.update.mockResolvedValue({});
      mockTx.vendorPayment.update.mockResolvedValue({
        id: 'vpay-1',
        status: VENDOR_PAYMENT_STATUS.PAID,
        journalId: 'journal-v-1',
      });

      const payment = await paymentService.createPayment(companyId, userId, {
        vendorId,
        amountPaisa: '50000000',
        paymentMethod: 'BANK_TRANSFER',
        allocations: [{ billId: 'bill-1', amountPaisa: '50000000' }],
      });

      expect(payment.status).toBe(VENDOR_PAYMENT_STATUS.PAID);
      expect(mockPostingService.post).toHaveBeenCalledWith(
        companyId,
        userId,
        'VENDOR_PAYMENT',
        expect.objectContaining({
          paymentId: 'vpay-1',
          vendorId,
          amountPaisa: '50000000',
        }),
        expect.anything(),
      );

      // Bill status updated to PAID
      expect(mockTx.vendorBill.update).toHaveBeenCalledWith({
        where: { id: 'bill-1' },
        data: { paidAmountPaisa: 50_000_000n, status: VENDOR_BILL_STATUS.PAID },
      });

      // Vendor outstanding decremented
      expect(mockTx.vendor.update).toHaveBeenCalledWith({
        where: { id: vendorId },
        data: {
          totalPaidPaisa: { increment: 50_000_000n },
          outstandingPaisa: { decrement: 50_000_000n },
        },
      });
    });
  });

  describe('S4: Vendor AP Reconciliation & Aging', () => {
    it('asserts vendor AP balance matches Account 2100 filtered by vendor party', async () => {
      mockTx.vendor.findFirst.mockResolvedValue({
        id: vendorId,
        name: 'Bengal Steel Ltd',
        outstandingPaisa: 20_000_000n, // ৳2,00,000 remaining
      });

      // In journal lines for 2100 (AP):
      // Bill posted: Cr 2100 50,000,000 paisa
      // Partial payment: Dr 2100 30,000,000 paisa
      // Net AP balance = Credits (50,000,000) - Debits (30,000,000) = 20,000,000 paisa
      mockTx.journalLine.findMany.mockResolvedValue([
        { debitPaisa: 0n, creditPaisa: 50_000_000n },
        { debitPaisa: 30_000_000n, creditPaisa: 0n },
      ]);

      const reconciliation = await apService.getVendorApBalance(companyId, vendorId);

      expect(reconciliation.account2100ApBalancePaisa).toBe(20_000_000n);
      expect(reconciliation.vendorOutstandingPaisa).toBe(20_000_000n);
      expect(reconciliation.isReconciled).toBe(true);
    });

    it('computes Accounts Payable aging report across buckets', async () => {
      const today = new Date('2026-10-05');
      mockTx.vendorBill.findMany.mockResolvedValue([
        {
          id: 'b1',
          netPayablePaisa: 10_000_000n,
          paidAmountPaisa: 0n,
          dueDate: new Date('2026-10-10'), // current / not overdue
          billDate: new Date('2026-10-01'),
        },
        {
          id: 'b2',
          netPayablePaisa: 20_000_000n,
          paidAmountPaisa: 0n,
          dueDate: new Date('2026-10-02'), // 3 days overdue -> DAYS_1_7
          billDate: new Date('2026-09-20'),
        },
        {
          id: 'b3',
          netPayablePaisa: 30_000_000n,
          paidAmountPaisa: 0n,
          dueDate: new Date('2026-09-15'), // 20 days overdue -> DAYS_8_30
          billDate: new Date('2026-09-01'),
        },
      ]);

      const aging = await apService.getVendorApAging(companyId, today);

      expect(aging.currentPaisa).toBe(10_000_000n);
      expect(aging.days1To7Paisa).toBe(20_000_000n);
      expect(aging.days8To30Paisa).toBe(30_000_000n);
      expect(aging.totalPaisa).toBe(60_000_000n);
    });
  });
});
