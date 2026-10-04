import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PaymentPostingService } from '../payment-posting.service.js';
import { PaymentService } from '../payment.service.js';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { SequenceService } from '../../../platform/sequence/sequence.service.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import type { IdempotencyService } from '../../../platform/idempotency/idempotency.service.js';
import type { PostingService } from '../../accounting/posting/posting.service.js';
import type { PaymentPostedHookRegistry } from './payment-posted.hook.js';

interface MockTx {
  payment: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  paymentStatusHistory: {
    create: ReturnType<typeof vi.fn>;
  };
  installment: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  receipt: {
    create: ReturnType<typeof vi.fn>;
  };
  chequeEvent: {
    create: ReturnType<typeof vi.fn>;
  };
}

describe('PaymentService - Post, Allocation & Receipts (Phase A7.2)', () => {
  let service: PaymentService;
  let mockTenantDb: Partial<TenantDb>;
  let mockSequenceService: Partial<SequenceService>;
  let mockAuditService: Partial<AuditService>;
  let mockOutboxService: Partial<OutboxService>;
  let mockIdempotencyService: Partial<IdempotencyService>;
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
      installment: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      receipt: {
        create: vi.fn(),
      },
      chequeEvent: {
        create: vi.fn(),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_companyId, callback) =>
        callback(mockTx as unknown as Parameters<typeof callback>[0]),
      ),
    };

    mockSequenceService = {
      next: vi.fn().mockResolvedValue(1),
      format: vi.fn().mockReturnValue('REC-2026-00001'),
    };

    mockAuditService = { record: vi.fn().mockResolvedValue(undefined) };
    mockOutboxService = { emit: vi.fn().mockResolvedValue(undefined) };
    mockIdempotencyService = {
      begin: vi.fn().mockResolvedValue({ replayed: false }),
      complete: vi.fn().mockResolvedValue(undefined),
    };
    mockPostingService = {
      post: vi.fn().mockResolvedValue([{ id: 'journal-1', journalNumber: 'JRN-2026-00001' }]),
    };
    mockHookRegistry = {
      execute: vi.fn().mockResolvedValue(undefined),
    };

    const paymentPostingService = new PaymentPostingService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      mockOutboxService as OutboxService,
      mockIdempotencyService as IdempotencyService,
      mockPostingService as PostingService,
      mockHookRegistry as PaymentPostedHookRegistry,
    );

    service = new PaymentService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      mockIdempotencyService as IdempotencyService,
      paymentPostingService,
    );
  });

  it('AT-05: Partial payment leaves remaining balance of ৳2,00,000 on a ৳3,00,000 installment', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const paymentId = 'pay-05';
    const bookingId = 'bkg-05';

    mockTx.payment.findFirst.mockResolvedValue({
      id: paymentId,
      companyId,
      paymentNumber: 'PAY-2026-00001',
      bookingId,
      customerId: 'cust-1',
      amountPaisa: 10000000n, // ৳1,00,000
      paymentType: 'INSTALLMENT',
      paymentMethod: 'BANK_TRANSFER',
      status: 'Draft',
      isDraft: true,
      paymentDate: new Date('2026-10-05'),
    });

    mockTx.installment.findMany.mockResolvedValue([
      {
        id: 'inst-1',
        installmentNumber: 1,
        name: 'Installment 1',
        type: 'REGULAR',
        dueDate: new Date('2026-11-01'),
        amountPaisa: 30000000n, // ৳3,00,000
        paidAmountPaisa: 0n,
        remainingAmountPaisa: 30000000n,
        lateFeePaisa: 0n,
      },
    ]);

    mockTx.receipt.create.mockResolvedValue({
      id: 'rec-1',
      receiptNumber: 'REC-2026-00001',
      amountPaisa: 10000000n,
    });

    mockTx.payment.update.mockImplementation((args: { data?: Record<string, unknown> }) =>
      Promise.resolve({
        id: paymentId,
        companyId,
        paymentNumber: 'PAY-2026-00001',
        status: 'Posted',
        amountPaisa: 10000000n,
        paymentType: 'INSTALLMENT',
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: new Date('2026-10-05'),
        isDraft: false,
        createdAt: new Date(),
        ...args.data,
      }),
    );

    await service.postPayment(companyId, 'user-1', paymentId, { notes: 'Paid ৳1,00,000' });

    // Installment updated: paid becomes ৳1,00,000, remaining becomes ৳2,00,000, status Partially Paid
    expect(mockTx.installment.update).toHaveBeenCalledWith({
      where: { id: 'inst-1' },
      data: {
        paidAmountPaisa: 10000000n,
        remainingAmountPaisa: 20000000n,
        paymentState: 'Partially Paid',
      },
    });

    // Receipt issued with ৳1,00,000 in words
    expect(mockTx.receipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          receiptNumber: 'REC-2026-00001',
          amountPaisa: 10000000n,
          amountInWords: 'One Lakh Taka Only',
          previousDuePaisa: 30000000n,
          currentDuePaisa: 20000000n,
        }),
      }),
    );

    // Journal posted for PAYMENT_POSTED
    expect(mockPostingService.post).toHaveBeenCalledWith(
      companyId,
      'user-1',
      'PAYMENT_POSTED',
      expect.objectContaining({
        allocatedPaisa: '10000000',
        overpaymentPaisa: '0',
      }),
      mockTx,
    );

    // Hook executed
    expect(mockHookRegistry.execute).toHaveBeenCalled();
  });

  it('AT-22: Overpayment recorded as customer advance (overpaymentPaisa > 0)', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const paymentId = 'pay-22';
    const bookingId = 'bkg-22';

    // Customer pays ৳4,00,000 against a ৳3,00,000 due installment
    mockTx.payment.findFirst.mockResolvedValue({
      id: paymentId,
      companyId,
      paymentNumber: 'PAY-2026-00002',
      bookingId,
      customerId: 'cust-1',
      amountPaisa: 40000000n, // ৳4,00,000
      paymentType: 'INSTALLMENT',
      paymentMethod: 'CASH',
      status: 'Draft',
      isDraft: true,
      paymentDate: new Date('2026-10-05'),
    });

    mockTx.installment.findMany.mockResolvedValue([
      {
        id: 'inst-1',
        installmentNumber: 1,
        name: 'Installment 1',
        type: 'REGULAR',
        dueDate: new Date('2026-11-01'),
        amountPaisa: 30000000n, // ৳3,00,000
        paidAmountPaisa: 0n,
        remainingAmountPaisa: 30000000n,
        lateFeePaisa: 0n,
      },
    ]);

    mockTx.receipt.create.mockResolvedValue({
      id: 'rec-2',
      receiptNumber: 'REC-2026-00002',
      amountPaisa: 40000000n,
    });

    mockTx.payment.update.mockImplementation((args: { data?: Record<string, unknown> }) =>
      Promise.resolve({
        id: paymentId,
        companyId,
        paymentNumber: 'PAY-2026-00002',
        status: 'Posted',
        amountPaisa: 40000000n,
        paymentType: 'INSTALLMENT',
        paymentMethod: 'CASH',
        paymentDate: new Date('2026-10-05'),
        isDraft: false,
        createdAt: new Date(),
        ...args.data,
      }),
    );

    await service.postPayment(companyId, 'user-1', paymentId, { notes: 'Overpaid installment' });

    // Installment paid in full
    expect(mockTx.installment.update).toHaveBeenCalledWith({
      where: { id: 'inst-1' },
      data: {
        paidAmountPaisa: 30000000n,
        remainingAmountPaisa: 0n,
        paymentState: 'Paid',
      },
    });

    // Journal contains allocated = 30000000 and overpayment = 10000000 (advance)
    expect(mockPostingService.post).toHaveBeenCalledWith(
      companyId,
      'user-1',
      'PAYMENT_POSTED',
      expect.objectContaining({
        allocatedPaisa: '30000000',
        overpaymentPaisa: '10000000',
        paymentMethod: 'CASH',
      }),
      mockTx,
    );
  });

  it('Cheque payment transitions to Received and creates ChequeEvent without immediate receipt or journal', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const paymentId = 'pay-cheque';

    mockTx.payment.findFirst.mockResolvedValue({
      id: paymentId,
      companyId,
      paymentNumber: 'PAY-2026-00003',
      customerId: 'cust-1',
      amountPaisa: 50000000n,
      paymentType: 'BOOKING_AMOUNT',
      paymentMethod: 'CHEQUE',
      chequeNumber: 'CHQ-987654',
      bankName: 'City Bank',
      bankBranch: 'Gulshan',
      status: 'Draft',
      isDraft: true,
      paymentDate: new Date('2026-10-05'),
    });

    mockTx.payment.update.mockResolvedValue({
      id: paymentId,
      companyId,
      paymentNumber: 'PAY-2026-00003',
      status: 'Received',
      amountPaisa: 50000000n,
      paymentType: 'BOOKING_AMOUNT',
      paymentMethod: 'CHEQUE',
      paymentDate: new Date('2026-10-05'),
      isDraft: false,
      createdAt: new Date(),
    });

    const res = await service.postPayment(companyId, 'user-1', paymentId, {
      notes: 'Cheque received',
    });

    expect(res.status).toBe('Received');
    expect(mockTx.chequeEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: 'RECEIVED',
          chequeNumber: 'CHQ-987654',
          bankName: 'City Bank',
        }),
      }),
    );
    expect(mockTx.receipt.create).not.toHaveBeenCalled();
    expect(mockPostingService.post).not.toHaveBeenCalled();
  });
});
