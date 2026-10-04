import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import type { SequenceService } from '../../../platform/sequence/sequence.service.js';
import type { PostingService } from '../../accounting/posting/posting.service.js';
import { RefundService } from './refund.service.js';

interface MockTx {
  refund: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
}

describe('RefundService (Phase A7.6)', () => {
  let service: RefundService;
  let mockTenantDb: Partial<TenantDb>;
  let mockSequenceService: Partial<SequenceService>;
  let mockAuditService: Partial<AuditService>;
  let mockOutboxService: Partial<OutboxService>;
  let mockPostingService: Partial<PostingService>;
  let mockTx: MockTx;

  beforeEach(() => {
    mockTx = {
      refund: {
        create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'rfd-1', ...args?.data }),
        ),
        findFirst: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_companyId, callback) =>
        callback(mockTx as unknown as Parameters<typeof callback>[0]),
      ),
    };

    mockSequenceService = {
      next: vi.fn().mockResolvedValue(1),
      format: vi.fn().mockReturnValue('RFD-2026-00001'),
    };

    mockAuditService = { record: vi.fn().mockResolvedValue(undefined) };
    mockOutboxService = { emit: vi.fn().mockResolvedValue(undefined) };
    mockPostingService = {
      post: vi.fn().mockResolvedValue([{ id: 'jrn-rfd-1', journalNumber: 'JRN-RFD-01' }]),
    };

    service = new RefundService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      mockOutboxService as OutboxService,
      mockPostingService as PostingService,
    );
  });

  it('creates refund with sequence number and audit log', async () => {
    const refund = await service.createRefund(mockTx as unknown as TenantPrisma, {
      companyId: '00000000-0000-0000-0000-000000000001',
      bookingId: 'bkg-1',
      customerId: 'cust-1',
      amountPaisa: 90000000n,
      reason: 'Cancellation refund',
      createdById: 'user-1',
    });

    expect(refund.refundNumber).toBe('RFD-2026-00001');
    expect(refund.amountPaisa).toBe(90000000n);
    expect(mockAuditService.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ action: 'REFUND_CREATED' }),
    );
  });

  it('pays refund: posts REFUND_PAID journal, sets status Paid, records audit and outbox', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = 'user-001';
    const refundId = 'rfd-1';

    mockTx.refund.findFirst.mockResolvedValue({
      id: refundId,
      companyId,
      refundNumber: 'RFD-2026-00001',
      bookingId: 'bkg-1',
      customerId: 'cust-1',
      amountPaisa: 90000000n,
      status: 'Approved',
    });

    mockTx.refund.update.mockResolvedValue({
      id: refundId,
      companyId,
      refundNumber: 'RFD-2026-00001',
      bookingId: 'bkg-1',
      customerId: 'cust-1',
      amountPaisa: 90000000n,
      status: 'Paid',
      paidAt: new Date(),
      paidById: userId,
      paymentMethod: 'BANK_TRANSFER',
      bankAccountId: 'bank-1',
      journalId: 'jrn-rfd-1',
      createdAt: new Date(),
    });

    const result = await service.payRefund(companyId, userId, refundId, {
      paymentMethod: 'BANK_TRANSFER',
      bankAccountId: 'bank-1',
      bankAccountCode: '1020',
      reference: 'TXN-998877',
    });

    expect(result.status).toBe('Paid');
    expect(mockPostingService.post).toHaveBeenCalledWith(
      companyId,
      userId,
      'REFUND_PAID',
      expect.objectContaining({
        refundId,
        refundPaisa: '90000000',
        paymentMethod: 'BANK_TRANSFER',
      }),
      mockTx,
    );
    expect(mockAuditService.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ action: 'REFUND_PAID' }),
    );
    expect(mockOutboxService.emit).toHaveBeenCalledWith(
      mockTx,
      'refund.paid',
      expect.objectContaining({ refundId, amountPaisa: '90000000' }),
    );
  });
});
