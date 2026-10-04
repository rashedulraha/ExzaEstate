import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReversalService } from './reversal.service.js';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { SequenceService } from '../../../platform/sequence/sequence.service.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import type { PostingService } from '../../accounting/posting/posting.service.js';

interface MockTx {
  payment: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  paymentStatusHistory: {
    create: ReturnType<typeof vi.fn>;
  };
  paymentReversal: {
    create: ReturnType<typeof vi.fn>;
  };
  receiptVoid: {
    create: ReturnType<typeof vi.fn>;
  };
  receipt: {
    update: ReturnType<typeof vi.fn>;
  };
  installment: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

describe('ReversalService (AT-21 & Phase A7.4)', () => {
  let service: ReversalService;
  let mockTenantDb: Partial<TenantDb>;
  let mockSequenceService: Partial<SequenceService>;
  let mockAuditService: Partial<AuditService>;
  let mockOutboxService: Partial<OutboxService>;
  let mockPostingService: Partial<PostingService>;
  let mockTx: MockTx;

  beforeEach(() => {
    mockTx = {
      payment: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      paymentStatusHistory: {
        create: vi.fn(),
      },
      paymentReversal: {
        create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'rev-rec-1', createdAt: new Date(), ...args?.data }),
        ),
      },
      receiptVoid: {
        create: vi.fn().mockResolvedValue({ id: 'void-1' }),
      },
      receipt: {
        update: vi.fn().mockResolvedValue({ id: 'rec-1', isVoid: true }),
      },
      installment: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_companyId, callback) =>
        callback(mockTx as unknown as Parameters<typeof callback>[0]),
      ),
    };

    mockSequenceService = {
      next: vi.fn().mockResolvedValue(1),
      format: vi.fn().mockImplementation(({ prefix }) => `${prefix}-2026-00001`),
    };

    mockAuditService = { record: vi.fn().mockResolvedValue(undefined) };
    mockOutboxService = { emit: vi.fn().mockResolvedValue(undefined) };
    mockPostingService = {
      post: vi.fn().mockResolvedValue([{ id: 'rev-jrn-1', journalNumber: 'REV-JRN-01' }]),
    };

    service = new ReversalService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      mockOutboxService as OutboxService,
      mockPostingService as PostingService,
    );
  });

  it('AT-21: Reverses posted payment, marks receipt void, re-opens installment, posts mirror journal, nothing deleted', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const paymentId = 'pay-21';
    const bookingId = 'bkg-21';
    const receiptId = 'rec-21';

    mockTx.payment.findFirst.mockResolvedValue({
      id: paymentId,
      companyId,
      paymentNumber: 'PAY-2026-00005',
      status: 'Posted',
      amountPaisa: 30000000n, // ৳3,00,000
      bookingId,
      customerId: 'cust-1',
      journalId: 'orig-jrn-1',
      receipt: {
        id: receiptId,
        receiptNumber: 'REC-2026-00005',
        amountPaisa: 30000000n,
        isVoid: false,
      },
    });

    mockTx.installment.findMany.mockResolvedValue([
      {
        id: 'inst-21',
        installmentNumber: 1,
        amountPaisa: 30000000n,
        paidAmountPaisa: 30000000n,
        remainingAmountPaisa: 0n,
        waivedAmountPaisa: 0n,
        paymentState: 'Paid',
      },
    ]);

    const result = await service.reversePayment(companyId, 'user-1', paymentId, {
      reason: 'Wrong payment amount entered by teller',
      approvalId: 'app-999',
    });

    expect(result.reversalNumber).toBe('REV-2026-00001');

    // 1. Receipt voided (never deleted)
    expect(mockTx.receiptVoid.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId,
          receiptId,
          reason: 'Wrong payment amount entered by teller',
        }),
      }),
    );
    expect(mockTx.receipt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: receiptId },
        data: expect.objectContaining({ isVoid: true }),
      }),
    );

    // 2. Installment re-opened from Paid to Unpaid (remaining ৳3,00,000)
    expect(mockTx.installment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inst-21' },
        data: {
          paidAmountPaisa: 0n,
          remainingAmountPaisa: 30000000n,
          paymentState: 'Unpaid',
        },
      }),
    );

    // 3. Mirror journal posted
    expect(mockPostingService.post).toHaveBeenCalledWith(
      companyId,
      'user-1',
      'PAYMENT_REVERSED',
      expect.objectContaining({
        originalJournalId: 'orig-jrn-1',
        paymentId,
        reason: 'Wrong payment amount entered by teller',
      }),
      mockTx,
    );

    // 4. Payment status updated to Reversed
    expect(mockTx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: paymentId },
        data: expect.objectContaining({ status: 'Reversed' }),
      }),
    );

    // 5. Audit & outbox event
    expect(mockAuditService.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        action: 'PAYMENT_REVERSED',
        recordId: paymentId,
      }),
    );
    expect(mockOutboxService.emit).toHaveBeenCalledWith(
      mockTx,
      'payment.reversed',
      expect.objectContaining({
        paymentId,
        reversalNumber: 'REV-2026-00001',
      }),
    );
  });
});
