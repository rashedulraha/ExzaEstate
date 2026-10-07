import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { computeApprovalKpis } from './hooks/useApprovalList.js';
import { ApprovalDataTable } from './components/ApprovalDataTable.js';
import { ApprovalDecisionModal } from './components/ApprovalDecisionModal.js';
import type { ApprovalItem } from './schemas/approval.schema.js';

const mockApprovals: ApprovalItem[] = [
  {
    id: 'app-1',
    type: 'DISCOUNT',
    entityType: 'Quotation',
    entityId: 'quote-101',
    title: 'Discount Request for Plot-4A',
    requesterId: 'user-sales-1',
    amountPaisa: '50000000',
    percentage: 5,
    status: 'PENDING',
    currentTier: 1,
    maxTier: 2,
    createdAt: '2026-10-05T00:00:00Z',
    updatedAt: '2026-10-05T00:00:00Z',
  },
  {
    id: 'app-2',
    type: 'EXPENSE',
    entityType: 'Expense',
    entityId: 'exp-202',
    title: 'Site Boundary Wall Construction',
    requesterId: 'user-manager-2',
    amountPaisa: '150000000',
    percentage: null,
    status: 'APPROVED',
    currentTier: 2,
    maxTier: 2,
    createdAt: '2026-10-04T00:00:00Z',
    updatedAt: '2026-10-05T00:00:00Z',
  },
];

describe('Approvals Module', () => {
  it('computes approval KPIs accurately', () => {
    const kpis = computeApprovalKpis(mockApprovals);
    expect(kpis.pendingCount).toBe(1);
    expect(kpis.discountCount).toBe(1);
    expect(kpis.expenseCount).toBe(0);
    expect(kpis.approvedCount).toBe(1);
  });

  it('renders ApprovalDataTable with BDT formatting and tier details', () => {
    const onSelect = vi.fn();
    const onDecision = vi.fn();

    render(
      <ApprovalDataTable
        approvals={mockApprovals}
        isLoading={false}
        onSelectApproval={onSelect}
        onOpenDecision={onDecision}
        currentUserId="user-other"
      />,
    );

    expect(screen.getByText('Discount Request for Plot-4A')).toBeDefined();
    expect(screen.getByText('Site Boundary Wall Construction')).toBeDefined();
    expect(screen.getByText('BDT 5,00,000.00')).toBeDefined();
    expect(screen.getByText('Tier 1 of 2')).toBeDefined();
  });

  it('enforces Maker-Checker policy blocking self-approval (AT-24)', () => {
    const onSelect = vi.fn();
    const onDecision = vi.fn();

    render(
      <ApprovalDataTable
        approvals={mockApprovals}
        isLoading={false}
        onSelectApproval={onSelect}
        onOpenDecision={onDecision}
        currentUserId="user-sales-1"
      />,
    );

    const approveButton = screen.getByRole('button', { name: 'Approve' });
    expect(approveButton.hasAttribute('disabled')).toBe(true);
  });

  it('validates mandatory justification in ApprovalDecisionModal for rejection', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ApprovalDecisionModal
        isOpen={true}
        onClose={onClose}
        approval={mockApprovals[0] ?? null}
        decision="REJECT"
        onConfirm={onConfirm}
        isLoading={false}
        currentUserId="user-other"
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm REJECT' });
    fireEvent.click(confirmButton);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/A justification of at least 5 characters is required/)).toBeDefined();

    const input = screen.getByPlaceholderText('Explain why this request is rejected...');
    fireEvent.change(input, {
      target: { value: 'Exceeds maximum allowable margin for this quadrant' },
    });
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith('Exceeds maximum allowable margin for this quadrant');
  });
});
