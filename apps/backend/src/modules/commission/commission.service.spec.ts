import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CommissionService } from './commission.service.js';
import { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import type { TenantDb } from '../../database/tenant-db.service.js';
import type { SequenceService } from '../../platform/sequence/sequence.service.js';
import type { AuditService } from '../../platform/audit/audit.service.js';
import type { PostingService } from '../accounting/posting/posting.service.js';
import { COMMISSION_STATUS } from './domain/commission.constants.js';

interface MockCommissionTx {
  broker: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  commissionRule: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  commissionRecord: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  booking: {
    findFirst: ReturnType<typeof vi.fn>;
  };
}

describe('CommissionService (A8.3 & AT-36)', () => {
  let service: CommissionService;
  let mockTenantDb: Partial<TenantDb>;
  let mockSequenceService: Partial<SequenceService>;
  let mockAuditService: Partial<AuditService>;
  let mockPostingService: Partial<PostingService>;
  let fieldCrypto: FieldCryptoService;
  let mockTx: MockCommissionTx;

  const companyId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const brokerId = '00000000-0000-0000-0000-000000000010';
  const bookingId = '00000000-0000-0000-0000-000000000020';
  const projectId = '00000000-0000-0000-0000-000000000030';

  beforeEach(() => {
    mockTx = {
      broker: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      commissionRule: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      commissionRecord: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      booking: {
        findFirst: vi.fn(),
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
      post: vi.fn().mockResolvedValue([{ id: 'journal-comm-1', journalNumber: 'JV-2026-000001' }]),
    };

    fieldCrypto = new FieldCryptoService();

    service = new CommissionService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      fieldCrypto,
      mockPostingService as PostingService,
    );
  });

  describe('S1: Broker Master with Encryption & Rules', () => {
    it('creates broker with encrypted bank account details', async () => {
      let savedBankNo: string | undefined;
      mockTx.broker.create.mockImplementation(({ data }) => {
        savedBankNo = data.bankAccountNumber;
        return Promise.resolve({
          id: brokerId,
          ...data,
          totalEarnedPaisa: 0n,
          totalPaidPaisa: 0n,
          receivablePaisa: 0n,
        });
      });

      const broker = await service.createBroker(companyId, userId, {
        name: 'Prime Realty Brokerage',
        phone: '01911223344',
        bankName: 'Eastern Bank',
        bankAccountNumber: '9876543210',
      });

      expect(broker.id).toBe(brokerId);
      expect(savedBankNo).toMatch(/^enc:v1:/);
      expect(mockAuditService.record).toHaveBeenCalled();
    });
  });

  describe('S2 & AT-36: Commission Earned at Confirmation (No Journal)', () => {
    it('accrues commission as EARNED without posting any journal', async () => {
      mockTx.booking.findFirst.mockResolvedValue({
        id: bookingId,
        brokerId,
        netPricePaisa: 100_000_000n, // ৳10,00,000
        totalPaidPaisa: 20_000_000n,
      });

      mockTx.broker.findFirst.mockResolvedValue({
        id: brokerId,
        isActive: true,
      });

      mockTx.commissionRule.findFirst.mockResolvedValue({
        id: 'rule-1',
        calculationType: 'PERCENT_NET_PRICE',
        percentage: 2.0, // 2% of ৳10,00,000 = ৳20,000 (2,000,000 paisa)
      });

      mockTx.commissionRecord.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'comm-1',
          ...data,
        }),
      );

      const record = await service.accrueCommissionOnConfirmation(companyId, userId, bookingId);

      expect(record).toBeDefined();
      expect(record?.status).toBe(COMMISSION_STATUS.EARNED);
      expect(record?.amountPaisa).toBe(2_000_000n);

      // CRITICAL ACCEPTANCE CHECK: NO JOURNAL POSTED AT EARNED STAGE
      expect(mockPostingService.post).not.toHaveBeenCalled();

      // Broker earned balance incremented
      expect(mockTx.broker.update).toHaveBeenCalledWith({
        where: { id: brokerId },
        data: { totalEarnedPaisa: { increment: 2_000_000n } },
      });
    });
  });

  describe('S3: Approval and Payment Postings', () => {
    it('posts COMMISSION_APPROVED on approval and COMMISSION_PAID on payout', async () => {
      // 1. Approval
      mockTx.commissionRecord.findFirst.mockResolvedValue({
        id: 'comm-1',
        commissionNumber: 'COMM-2026-000001',
        brokerId,
        amountPaisa: 2_000_000n,
        status: COMMISSION_STATUS.EARNED,
        projectId,
      });

      mockTx.commissionRecord.update.mockResolvedValue({
        id: 'comm-1',
        status: COMMISSION_STATUS.APPROVED,
        approvalJournalId: 'journal-comm-1',
      });

      const approved = await service.approveCommission(companyId, userId, 'comm-1');
      expect(approved.status).toBe(COMMISSION_STATUS.APPROVED);
      expect(mockPostingService.post).toHaveBeenCalledWith(
        companyId,
        userId,
        'COMMISSION_APPROVED',
        expect.objectContaining({
          brokerId,
          amountPaisa: '2000000',
        }),
        expect.anything(),
      );

      // 2. Payment
      mockTx.commissionRecord.findFirst.mockResolvedValue({
        id: 'comm-1',
        commissionNumber: 'COMM-2026-000001',
        brokerId,
        amountPaisa: 2_000_000n,
        status: COMMISSION_STATUS.APPROVED,
      });

      mockTx.commissionRecord.update.mockResolvedValue({
        id: 'comm-1',
        status: COMMISSION_STATUS.PAID,
        paymentJournalId: 'journal-comm-2',
      });

      const paid = await service.payCommission(companyId, userId, 'comm-1', {
        paymentMethod: 'BANK_TRANSFER',
        bankAccountCode: '1020-01',
      });

      expect(paid.status).toBe(COMMISSION_STATUS.PAID);
      expect(mockPostingService.post).toHaveBeenCalledWith(
        companyId,
        userId,
        'COMMISSION_PAID',
        expect.objectContaining({
          brokerId,
          amountPaisa: '2000000',
        }),
        expect.anything(),
      );
      expect(mockTx.broker.update).toHaveBeenCalledWith({
        where: { id: brokerId },
        data: { totalPaidPaisa: { increment: 2_000_000n } },
      });
    });
  });

  describe('S4 & AT-36: Cancellation Clawback Rules', () => {
    it('reverses unpaid EARNED commission on cancellation without creating double journals', async () => {
      mockTx.commissionRecord.findMany.mockResolvedValue([
        {
          id: 'comm-1',
          brokerId,
          amountPaisa: 2_000_000n,
          status: COMMISSION_STATUS.EARNED, // Unpaid
        },
      ]);
      mockTx.commissionRecord.update.mockResolvedValue({});
      mockTx.broker.update.mockResolvedValue({});

      await service.clawbackCommissionOnCancellation(companyId, userId, bookingId);

      expect(mockTx.commissionRecord.update).toHaveBeenCalledWith({
        where: { id: 'comm-1' },
        data: { status: COMMISSION_STATUS.REVERSED, reversedAt: expect.any(Date) },
      });
      expect(mockTx.broker.update).toHaveBeenCalledWith({
        where: { id: brokerId },
        data: { totalEarnedPaisa: { decrement: 2_000_000n } },
      });
      // No journal posting called for reversal
      expect(mockPostingService.post).not.toHaveBeenCalled();
    });

    it('creates broker receivable on cancellation when commission was already PAID', async () => {
      mockTx.commissionRecord.findMany.mockResolvedValue([
        {
          id: 'comm-2',
          brokerId,
          amountPaisa: 2_000_000n,
          status: COMMISSION_STATUS.PAID, // Already paid!
        },
      ]);
      mockTx.commissionRecord.update.mockResolvedValue({});
      mockTx.broker.update.mockResolvedValue({});

      await service.clawbackCommissionOnCancellation(companyId, userId, bookingId);

      expect(mockTx.commissionRecord.update).toHaveBeenCalledWith({
        where: { id: 'comm-2' },
        data: {
          status: COMMISSION_STATUS.REVERSED,
          reversedAt: expect.any(Date),
          clawbackReceivableCreated: true,
        },
      });

      // Broker receivable incremented for recovery!
      expect(mockTx.broker.update).toHaveBeenCalledWith({
        where: { id: brokerId },
        data: {
          totalEarnedPaisa: { decrement: 2_000_000n },
          receivablePaisa: { increment: 2_000_000n },
        },
      });
    });
  });
});
