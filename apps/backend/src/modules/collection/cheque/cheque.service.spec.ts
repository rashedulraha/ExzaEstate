import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ChequeService } from './cheque.service.js';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { SequenceService } from '../../../platform/sequence/sequence.service.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import type { PostingService } from '../../accounting/posting/posting.service.js';
import type { PaymentPostedHookRegistry } from '../payment/payment-posted.hook.js';

interface MockTx {
  payment: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  paymentStatusHistory: {
    create: ReturnType<typeof vi.fn>;
  };
  chequeEvent: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  installment: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  receipt: {
    create: ReturnType<typeof vi.fn>;
  };
}

describe('ChequeService (AT-13 & Phase A7.3)', () => {
  let service: ChequeService;
  let mockTenantDb: Partial<TenantDb>;
  let mockSequenceService: Partial<SequenceService>;
  let mockAuditService: Partial<AuditService>;
  let mockOutboxService: Partial<OutboxService>;
  let mockPostingService: Partial<PostingService>;
  let mockHookRegistry: Partial<PaymentPostedHookRegistry>;
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
      chequeEvent: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      installment: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
      },
      receipt: {
        create: vi.fn().mockResolvedValue({ id: 'rec-chq-1', receiptNumber: 'REC-2026-00099' }),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_companyId, callback) =>
        callback(mockTx as unknown as Parameters<typeof callback>[0]),
      ),
    };

    mockSequenceService = {
      next: vi.fn().mockResolvedValue(99),
      format: vi.fn().mockReturnValue('REC-2026-00099'),
    };

    mockAuditService = { record: vi.fn().mockResolvedValue(undefined) };
    mockOutboxService = { emit: vi.fn().mockResolvedValue(undefined) };
    mockPostingService = { post: vi.fn().mockResolvedValue([]) };
    mockHookRegistry = { execute: vi.fn().mockResolvedValue(undefined) };

    service = new ChequeService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      mockOutboxService as OutboxService,
      mockPostingService as PostingService,
      mockHookRegistry as PaymentPostedHookRegistry,
    );
  });

  it('AT-13: Cheque clearance creates CLEARED event, issues receipt, posts journals and executes confirmation hook', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const paymentId = 'pay-chq-1';

    mockTx.payment.findFirst.mockResolvedValue({
      id: paymentId,
      companyId,
      paymentNumber: 'PAY-2026-00010',
      paymentMethod: 'CHEQUE',
      chequeNumber: 'CHQ-100200',
      status: 'Received',
      amountPaisa: 50000000n, // ৳5,00,000
      paymentType: 'BOOKING_AMOUNT',
      customerId: 'cust-1',
      bookingId: 'bkg-1',
      paymentDate: new Date('2026-10-01'),
      isDraft: false,
    });

    mockTx.chequeEvent.create.mockResolvedValue({
      id: 'chq-evt-1',
      event: 'CLEARED',
    });

    mockTx.payment.update.mockResolvedValue({
      id: paymentId,
      companyId,
      paymentNumber: 'PAY-2026-00010',
      paymentMethod: 'CHEQUE',
      status: 'Posted',
      chequeStatus: 'CLEARED',
      amountPaisa: 50000000n,
      paymentType: 'BOOKING_AMOUNT',
      customerId: 'cust-1',
      bookingId: 'bkg-1',
      receiptId: 'rec-chq-1',
      paymentDate: new Date('2026-10-01'),
      isDraft: false,
      createdAt: new Date(),
    });

    const res = await service.clearCheque(companyId, 'user-1', paymentId, {
      clearingDate: '2026-10-06',
      bankAccountCode: '1020',
      notes: 'Cleared through Sonali Bank',
    });

    expect(res.status).toBe('Posted');
    // Cheque event logged
    expect(mockTx.chequeEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: 'CLEARED',
          paymentId,
        }),
      }),
    );

    // Receipt issued
    expect(mockTx.receipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          receiptNumber: 'REC-2026-00099',
          amountInWords: 'Five Lakh Taka Only',
        }),
      }),
    );

    // Both journals posted: PAYMENT_POSTED and CHEQUE_CLEARED
    expect(mockPostingService.post).toHaveBeenCalledWith(
      companyId,
      'user-1',
      'PAYMENT_POSTED',
      expect.objectContaining({
        paymentMethod: 'CHEQUE',
        amountPaisa: '50000000',
      }),
      mockTx,
    );

    expect(mockPostingService.post).toHaveBeenCalledWith(
      companyId,
      'user-1',
      'CHEQUE_CLEARED',
      expect.objectContaining({
        chequeId: 'chq-evt-1',
        bankAccountCode: '1020',
        amountPaisa: '50000000',
      }),
      mockTx,
    );

    // Hook executed to confirm booking
    expect(mockHookRegistry.execute).toHaveBeenCalled();
  });

  it('AT-13: Cheque bounce marks payment Cancelled with reason and records BOUNCED event without any posting', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const paymentId = 'pay-chq-2';

    mockTx.payment.findFirst.mockResolvedValue({
      id: paymentId,
      companyId,
      paymentNumber: 'PAY-2026-00011',
      paymentMethod: 'CHEQUE',
      chequeNumber: 'CHQ-100201',
      status: 'Received',
      amountPaisa: 50000000n,
      paymentType: 'BOOKING_AMOUNT',
      customerId: 'cust-1',
      paymentDate: new Date('2026-10-01'),
      isDraft: false,
    });

    mockTx.payment.update.mockResolvedValue({
      id: paymentId,
      companyId,
      paymentNumber: 'PAY-2026-00011',
      paymentMethod: 'CHEQUE',
      status: 'Cancelled',
      chequeStatus: 'BOUNCED',
      amountPaisa: 50000000n,
      paymentType: 'BOOKING_AMOUNT',
      customerId: 'cust-1',
      paymentDate: new Date('2026-10-01'),
      isDraft: false,
      createdAt: new Date(),
    });

    const res = await service.bounceCheque(companyId, 'user-1', paymentId, {
      bounceReason: 'Signature mismatch',
      notes: 'Customer notified to issue fresh cheque',
    });

    expect(res.status).toBe('Cancelled');
    expect(mockTx.chequeEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: 'BOUNCED',
          bounceReason: 'Signature mismatch',
        }),
      }),
    );

    // Crucial invariant: no journal posted, no receipt issued
    expect(mockPostingService.post).not.toHaveBeenCalled();
    expect(mockTx.receipt.create).not.toHaveBeenCalled();
    expect(mockOutboxService.emit).toHaveBeenCalledWith(
      mockTx,
      'payment.cheque_bounced',
      expect.objectContaining({
        paymentId,
        bounceReason: 'Signature mismatch',
      }),
    );
  });
});
