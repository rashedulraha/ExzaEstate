import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ExpenseService } from './expense.service.js';
import type { ExpenseCategoryService } from './expense-category.service.js';
import type { TenantDb } from '../../database/tenant-db.service.js';
import type { SequenceService } from '../../platform/sequence/sequence.service.js';
import type { AuditService } from '../../platform/audit/audit.service.js';
import type { PostingService } from '../accounting/posting/posting.service.js';
import { EXPENSE_STATUS } from './domain/expense.constants.js';

interface MockTx {
  expenseCategory: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  expenseVoucher: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  companySetting: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  userRole: {
    findMany: ReturnType<typeof vi.fn>;
  };
}

describe('ExpenseService (A8.1 & AT-07)', () => {
  let service: ExpenseService;
  let mockTenantDb: Partial<TenantDb>;
  let mockSequenceService: Partial<SequenceService>;
  let mockAuditService: Partial<AuditService>;
  let mockPostingService: Partial<PostingService>;
  let mockCategoryService: Partial<ExpenseCategoryService>;
  let mockTx: MockTx;

  const companyId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const gmUserId = '00000000-0000-0000-0000-000000000003';
  const mdUserId = '00000000-0000-0000-0000-000000000004';
  const categoryId = '00000000-0000-0000-0000-000000000005';
  const projectId = '00000000-0000-0000-0000-000000000006';

  beforeEach(() => {
    mockTx = {
      expenseCategory: {
        findFirst: vi.fn(),
      },
      expenseVoucher: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      companySetting: {
        findUnique: vi.fn(),
      },
      userRole: {
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
      format: vi.fn().mockReturnValue('EXP-2026-000001'),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockPostingService = {
      post: vi.fn().mockResolvedValue([{ id: 'journal-123', journalNumber: 'JV-2026-000001' }]),
    };

    mockCategoryService = {
      getCategoryById: vi.fn().mockResolvedValue({
        id: categoryId,
        code: 'EXP_DEV',
        name: 'Development Cost',
        accountCode: '5200',
        isActive: true,
      }),
    };

    service = new ExpenseService(
      mockTenantDb as TenantDb,
      mockSequenceService as SequenceService,
      mockAuditService as AuditService,
      mockPostingService as PostingService,
      mockCategoryService as ExpenseCategoryService,
    );
  });

  it('creates an expense voucher in DRAFT status with sequential voucher number', async () => {
    mockTx.companySetting.findUnique.mockResolvedValue(null); // default 50,000,000 paisa threshold
    mockTx.expenseVoucher.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'voucher-1',
        voucherNumber: data.voucherNumber,
        status: data.status,
        amountPaisa: data.amountPaisa,
        requiresMdApproval: data.requiresMdApproval,
        category: { accountCode: '5200' },
        attachments: [],
      }),
    );

    const voucher = await service.createVoucher(companyId, userId, {
      categoryId,
      amountPaisa: '60000000', // ৳6,00,000
      description: 'Site leveling and preparation',
      payeeName: 'National Contractors Ltd',
      projectId,
      costCenter: 'CC-PRJ-01',
    });

    expect(voucher.status).toBe(EXPENSE_STATUS.DRAFT);
    expect(voucher.requiresMdApproval).toBe(true);
    expect(mockSequenceService.next).toHaveBeenCalledWith(expect.anything(), {
      type: 'EXPENSE_VOUCHER',
      fiscalYear: expect.any(String),
    });
    expect(mockAuditService.record).toHaveBeenCalled();
  });

  it('submits a DRAFT voucher to SUBMITTED status', async () => {
    mockTx.expenseVoucher.findFirst.mockResolvedValue({
      id: 'voucher-1',
      status: EXPENSE_STATUS.DRAFT,
      amountPaisa: 60_000_000n,
    });
    mockTx.expenseVoucher.update.mockResolvedValue({
      id: 'voucher-1',
      status: EXPENSE_STATUS.SUBMITTED,
    });

    const result = await service.submitVoucher(companyId, userId, 'voucher-1');
    expect(result.status).toBe(EXPENSE_STATUS.SUBMITTED);
  });

  describe('AT-07: Expense Approval Thresholds (৳6,00,000 > ৳5,00,000)', () => {
    it('blocks GM from approving ৳6,00,000 expense because it exceeds MD threshold', async () => {
      mockTx.expenseVoucher.findFirst.mockResolvedValue({
        id: 'voucher-1',
        status: EXPENSE_STATUS.SUBMITTED,
        amountPaisa: 60_000_000n, // ৳6,00,000 > ৳5,00,000
        createdById: userId,
      });
      mockTx.companySetting.findUnique.mockResolvedValue(null); // default threshold
      mockTx.userRole.findMany.mockResolvedValue([{ role: { code: 'GENERAL_MANAGER' } }]);

      await expect(service.approveVoucher(companyId, gmUserId, 'voucher-1')).rejects.toThrow(
        'strictly requires Managing Director (MD) approval',
      );
    });

    it('allows MD to approve ৳6,00,000 expense', async () => {
      mockTx.expenseVoucher.findFirst.mockResolvedValue({
        id: 'voucher-1',
        status: EXPENSE_STATUS.SUBMITTED,
        amountPaisa: 60_000_000n,
        createdById: userId,
      });
      mockTx.companySetting.findUnique.mockResolvedValue(null);
      mockTx.userRole.findMany.mockResolvedValue([{ role: { code: 'MANAGING_DIRECTOR' } }]);
      mockTx.expenseVoucher.update.mockResolvedValue({
        id: 'voucher-1',
        status: EXPENSE_STATUS.APPROVED,
        approvedById: mdUserId,
      });

      const approved = await service.approveVoucher(companyId, mdUserId, 'voucher-1');
      expect(approved.status).toBe(EXPENSE_STATUS.APPROVED);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'EXPENSE_VOUCHER_APPROVED' }),
      );
    });

    it('allows GM to approve expense within threshold (e.g. ৳2,00,000)', async () => {
      mockTx.expenseVoucher.findFirst.mockResolvedValue({
        id: 'voucher-2',
        status: EXPENSE_STATUS.SUBMITTED,
        amountPaisa: 20_000_000n, // ৳2,00,000 < ৳5,00,000
        createdById: userId,
      });
      mockTx.companySetting.findUnique.mockResolvedValue(null);
      mockTx.userRole.findMany.mockResolvedValue([{ role: { code: 'GENERAL_MANAGER' } }]);
      mockTx.expenseVoucher.update.mockResolvedValue({
        id: 'voucher-2',
        status: EXPENSE_STATUS.APPROVED,
        approvedById: gmUserId,
      });

      const approved = await service.approveVoucher(companyId, gmUserId, 'voucher-2');
      expect(approved.status).toBe(EXPENSE_STATUS.APPROVED);
    });
  });

  describe('Payment & Posting Workflow (AT-07)', () => {
    it('verifies and pays voucher: triggers EXPENSE_APPROVED_PAID posting and records journal', async () => {
      const voucherRecord = {
        id: 'voucher-1',
        voucherNumber: 'EXP-2026-000001',
        status: EXPENSE_STATUS.APPROVED,
        amountPaisa: 60_000_000n,
        category: { accountCode: '5200' },
        description: 'Site leveling and preparation',
        bankAccountCode: '1020',
        paymentMethod: 'BANK_TRANSFER',
        paidLater: false,
        vendorId: null,
        projectId,
        costCenter: 'CC-PRJ-01',
      };

      // 1. Accounts verification
      mockTx.expenseVoucher.findFirst.mockResolvedValue(voucherRecord);
      mockTx.expenseVoucher.update.mockResolvedValue({
        ...voucherRecord,
        status: EXPENSE_STATUS.VERIFIED,
      });

      const verified = await service.verifyVoucher(companyId, userId, 'voucher-1');
      expect(verified.status).toBe(EXPENSE_STATUS.VERIFIED);

      // 2. Payment execution
      mockTx.expenseVoucher.findFirst.mockResolvedValue({
        ...voucherRecord,
        status: EXPENSE_STATUS.VERIFIED,
      });
      mockTx.expenseVoucher.update.mockResolvedValue({
        ...voucherRecord,
        status: EXPENSE_STATUS.PAID,
        journalId: 'journal-123',
        paidAt: new Date(),
      });

      const paid = await service.payVoucher(companyId, userId, 'voucher-1', {
        paymentMethod: 'BANK_TRANSFER',
        bankAccountCode: '1020-01',
        reference: 'TRX-987654',
      });

      expect(paid.status).toBe(EXPENSE_STATUS.PAID);
      expect(mockPostingService.post).toHaveBeenCalledWith(
        companyId,
        userId,
        'EXPENSE_APPROVED_PAID',
        expect.objectContaining({
          expenseId: 'voucher-1',
          amountPaisa: '60000000',
          expenseAccountCode: '5200',
          bankAccountCode: '1020-01',
          paymentMethod: 'BANK_TRANSFER',
          costCenter: 'CC-PRJ-01',
          projectId,
        }),
        expect.anything(),
      );
    });

    it('rolls up project expenses accurately', async () => {
      mockTx.expenseVoucher.findMany.mockResolvedValue([
        { id: 'v1', amountPaisa: 60_000_000n, projectId, status: EXPENSE_STATUS.PAID },
        { id: 'v2', amountPaisa: 40_000_000n, projectId, status: EXPENSE_STATUS.PAID },
      ]);

      const rollup = await service.getProjectExpensesRollup(companyId, projectId);
      expect(rollup.projectId).toBe(projectId);
      expect(rollup.totalPaidExpensePaisa).toBe(100_000_000n);
      expect(rollup.voucherCount).toBe(2);
    });
  });
});
