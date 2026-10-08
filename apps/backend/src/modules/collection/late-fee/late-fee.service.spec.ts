import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { OutboxService } from '../../../platform/outbox/outbox.service.js';
import type { PostingService } from '../../accounting/posting/posting.service.js';
import { LateFeeService } from './late-fee.service.js';

interface MockTx {
  installment: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  lateFeeRecord: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

describe('LateFeeService (AT-33 & Phase A7.7)', () => {
  let service: LateFeeService;
  let mockTenantDb: Partial<TenantDb>;
  let mockAuditService: Partial<AuditService>;
  let mockOutboxService: Partial<OutboxService>;
  let mockPostingService: Partial<PostingService>;
  let mockTx: MockTx;

  beforeEach(() => {
    mockTx = {
      installment: {
        findFirst: vi.fn(),
      },
      lateFeeRecord: {
        create: vi
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'lf-1', ...args?.data, createdAt: new Date() }),
          ),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };

    mockTenantDb = {
      withCompany: vi.fn(async (_companyId, callback) =>
        callback(mockTx as unknown as Parameters<typeof callback>[0]),
      ),
    };

    mockAuditService = { record: vi.fn().mockResolvedValue(undefined) };
    mockOutboxService = { emit: vi.fn().mockResolvedValue(undefined) };
    mockPostingService = {
      post: vi.fn().mockResolvedValue([{ id: 'jrn-lf-1', journalNumber: 'JRN-LF-01' }]),
    };

    service = new LateFeeService(
      mockTenantDb as TenantDb,
      mockAuditService as AuditService,
      mockOutboxService as OutboxService,
      mockPostingService as PostingService,
    );
  });

  it('AT-33: with late_fee_rate = 0, nothing is charged', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = 'user-001';
    const installmentId = 'inst-001';

    const result = await service.chargeLateFee(companyId, userId, installmentId, {
      ratePct: 0,
    });

    expect(result).toBeNull();
    expect(mockPostingService.post).not.toHaveBeenCalled();
    expect(mockTx.lateFeeRecord.create).not.toHaveBeenCalled();
  });

  it('charges late fee when rate > 0 and overdue beyond grace period', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = 'user-001';
    const installmentId = 'inst-002';

    mockTx.installment.findFirst.mockResolvedValue({
      id: installmentId,
      companyId,
      installmentNumber: 3,
      remainingAmountPaisa: 100000000n, // ৳10,00,000
      dueDate: new Date('2026-01-01'),
      paymentState: 'Unpaid',
      booking: {
        customerId: 'cust-01',
        propertyId: 'prop-01',
      },
    });

    // As of 2026-02-15 (45 days overdue, grace 7 days) -> 2% rate
    const result = await service.chargeLateFee(companyId, userId, installmentId, {
      ratePct: 2,
      graceDays: 7,
      asOfDate: '2026-02-15',
    });

    expect(result).not.toBeNull();
    expect(result?.amountPaisa).toBe('4000000'); // ৳40,000 (2 months @ 2% on 10,00,000)
    expect(mockPostingService.post).toHaveBeenCalledWith(
      companyId,
      userId,
      'LATE_FEE_CHARGED',
      expect.objectContaining({
        customerId: 'cust-01',
        feePaisa: '4000000',
      }),
      mockTx,
    );
    expect(mockAuditService.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ action: 'LATE_FEE_CHARGED' }),
    );
    expect(mockOutboxService.emit).toHaveBeenCalledWith(
      mockTx,
      'late_fee.charged',
      expect.objectContaining({ installmentId, amountPaisa: '4000000' }),
    );
  });

  it('waives charged late fee with LATE_FEE_WAIVED mirror journal', async () => {
    const companyId = '00000000-0000-0000-0000-000000000001';
    const userId = 'user-001';
    const recordId = 'lf-rec-01';

    mockTx.lateFeeRecord.findFirst.mockResolvedValue({
      id: recordId,
      companyId,
      amountPaisa: 4000000n,
      isWaived: false,
      installment: {
        booking: {
          customerId: 'cust-01',
        },
      },
    });

    mockTx.lateFeeRecord.update.mockResolvedValue({
      id: recordId,
      companyId,
      amountPaisa: 4000000n,
      isWaived: true,
      waivedAt: new Date(),
      waivedById: userId,
      createdAt: new Date(),
    });

    const result = await service.waiveLateFee(companyId, userId, recordId, {
      reason: 'Approved waiver by CEO',
    });

    expect(result.isWaived).toBe(true);
    expect(mockPostingService.post).toHaveBeenCalledWith(
      companyId,
      userId,
      'LATE_FEE_WAIVED',
      expect.objectContaining({
        customerId: 'cust-01',
        feePaisa: '4000000',
        reason: 'Approved waiver by CEO',
      }),
      mockTx,
    );
    expect(mockAuditService.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ action: 'LATE_FEE_WAIVED' }),
    );
  });
});
