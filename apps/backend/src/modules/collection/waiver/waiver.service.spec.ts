import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import type { SequenceService } from '../../../platform/sequence/sequence.service.js';
import type { PostingService } from '../../accounting/posting/posting.service.js';
import { WaiverService } from './waiver.service.js';

interface MockTx {
  installment: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  installmentWaiver: {
    create: ReturnType<typeof vi.fn>;
  };
}

describe('WaiverService (AT-33 & Phase A7.7)', () => {
  let service: WaiverService;
  let mockTenantDb: Partial<TenantDb>;
  let mockSequenceService: Partial<SequenceService>;
  let mockAuditService: Partial<AuditService>;
  let mockOutboxService: Partial<OutboxService>;
  let mockPostingService: Partial<PostingService>;
  let mockTx: MockTx;

  beforeEach(() => {
    mockTx = {
      installment: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      installmentWaiver: {
        create: vi
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'wvr-1', ...args?.data, createdAt: new Date() }),
          ),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_companyId, callback) =>
        callback(mockTx as unknown as Parameters<typeof callback>[0]),
      ),
    };

    mockSequenceService = {
      next: vi.fn().mockResolvedValue(1),
      format: vi.fn().mockReturnValue('WVR-2026-00001'),
    };

    mockAuditService = { record: vi.fn().mockResolvedValue(undefined) };
    mockOutboxService = { emit: vi.fn().mockResolvedValue(undefined) };
    mockPostingService = {
      post: vi.fn().mockResolvedValue([{ id: 'jrn-wvr-1', journalNumber: 'JRN-WVR-01' }]),
    };

    service = new WaiverService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      mockOutboxService as OutboxService,
      mockPostingService as PostingService,
    );
  });

  it('AT-33: Waives installment principal, posts adjustment journal, sets installment state Waived', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = 'user-001';
    const installmentId = 'inst-at33';
    const bookingId = 'bkg-at33';
    const customerId = 'cust-at33';

    mockTx.installment.findFirst.mockResolvedValue({
      id: installmentId,
      companyId,
      bookingId,
      remainingAmountPaisa: 50000000n, // ৳5,00,000
      waivedAmountPaisa: 0n,
      paymentState: 'Unpaid',
      booking: {
        customerId,
      },
    });

    mockTx.installment.update.mockResolvedValue({
      id: installmentId,
      remainingAmountPaisa: 0n,
      waivedAmountPaisa: 50000000n,
      paymentState: 'Waived',
    });

    const result = await service.waiveInstallment(companyId, userId, installmentId, {
      amountPaisa: '50000000',
      reason: 'Management approved ৳5L discount waiver',
    });

    // 1. Returns approved waiver with sequence number
    expect(result.waiverNumber).toBe('WVR-2026-00001');
    expect(result.amountPaisa).toBe('50000000');
    expect(result.status).toBe('Approved');

    // 2. Installment updated: remaining = 0, state = Waived
    expect(mockTx.installment.update).toHaveBeenCalledWith({
      where: { id: installmentId },
      data: {
        remainingAmountPaisa: 0n,
        waivedAmountPaisa: 50000000n,
        paymentState: 'Waived',
      },
    });

    // 3. Adjustment posting: INSTALLMENT_WAIVED (Dr 5900 Discount / Cr 1100 Customer Receivable)
    expect(mockPostingService.post).toHaveBeenCalledWith(
      companyId,
      userId,
      'INSTALLMENT_WAIVED',
      expect.objectContaining({
        installmentId,
        customerId,
        amountPaisa: '50000000',
        reason: 'Management approved ৳5L discount waiver',
      }),
      mockTx,
    );

    // 4. Audit logged
    expect(mockAuditService.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        action: 'INSTALLMENT_WAIVED',
        recordType: 'InstallmentWaiver',
      }),
    );

    // 5. Outbox emitted
    expect(mockOutboxService.emit).toHaveBeenCalledWith(
      mockTx,
      'installment.waived',
      expect.objectContaining({
        installmentId,
        customerId,
        amountPaisa: '50000000',
      }),
    );
  });
});
