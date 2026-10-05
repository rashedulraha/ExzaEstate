import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PERMISSIONS } from '@exzaestate/shared';
import * as appCore from '@exzaestate/app-core';
import { JournalDrawer } from './components/journals/JournalDrawer.js';
import { JournalEntryModal } from './components/journals/JournalEntryModal.js';
import { JournalReversalModal } from './components/journals/JournalReversalModal.js';
import { testAccounts, testJournals } from './accounting.test-fixtures.js';

const mockUsePermission = vi.fn();

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: (perm: string, scope?: unknown) => mockUsePermission(perm, scope),
  };
});

describe('Accounting Module (B5) - S2: Journal Lifecycle & Seals', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });
  });

  it('renders JournalEntryModal with signature BalanceBeam showing live difference on unbalanced lines', () => {
    render(
      <JournalEntryModal
        isOpen={true}
        onClose={vi.fn()}
        accounts={testAccounts}
        onSubmitDraft={vi.fn()}
        onSubmitPost={vi.fn()}
      />,
    );

    // Signature BalanceBeam must be rendered
    expect(screen.getByTestId('balance-beam')).toBeDefined();
    expect(screen.getByText('Total Debits (Dr)')).toBeDefined();
    expect(screen.getByText('Total Credits (Cr)')).toBeDefined();
    expect(screen.getByText('Out of Balance')).toBeDefined();
  });

  it('allows saving unbalanced journal as DRAFT (backend remains the authority)', async () => {
    const onSubmitDraft = vi.fn().mockResolvedValue({});

    render(
      <JournalEntryModal
        isOpen={true}
        onClose={vi.fn()}
        accounts={testAccounts}
        onSubmitDraft={onSubmitDraft}
        onSubmitPost={vi.fn()}
      />,
    );

    // Enter Narration
    fireEvent.change(screen.getByLabelText(/Voucher Narration/i), {
      target: { value: 'Draft rent provision voucher' },
    });

    // Select account for first line
    const account0 = screen.getByTestId('line-account-0');
    fireEvent.change(account0, { target: { value: 'acc-cash' } });

    // Enter debit on line 0 but leave credit empty
    const debit0 = screen.getByTestId('line-debit-0');
    fireEvent.change(debit0, { target: { value: '500000' } });

    // Select account for line 1
    const account1 = screen.getByTestId('line-account-1');
    fireEvent.change(account1, { target: { value: 'acc-ap' } });

    // Save as Draft button should be enabled even though unbalanced
    const draftBtn = screen.getByTestId('save-journal-draft-btn');
    expect(draftBtn).toBeDefined();

    fireEvent.click(draftBtn);

    await waitFor(() => {
      expect(onSubmitDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          narration: 'Draft rent provision voucher',
          actionType: 'DRAFT',
        }),
      );
    });
  });

  it('CRITICAL ACCEPTANCE: Executive role cannot post journal (has NO "Post Journal" button)', () => {
    // Mock Executive permissions: has JOURNAL_VIEW, JOURNAL_CREATE, but lacks JOURNAL_POST
    mockUsePermission.mockImplementation((perm: string) => {
      return {
        hasPermission: perm !== PERMISSIONS.JOURNAL_POST,
        scope: 'OWN',
      };
    });

    render(
      <JournalEntryModal
        isOpen={true}
        onClose={vi.fn()}
        accounts={testAccounts}
        onSubmitDraft={vi.fn()}
        onSubmitPost={vi.fn()}
      />,
    );

    // Executive has Save as Draft button
    expect(screen.getByTestId('save-journal-draft-btn')).toBeDefined();

    // Post Journal button MUST NOT be rendered
    expect(screen.queryByTestId('post-journal-btn')).toBeNull();

    // Explanatory prompt rendered
    expect(screen.getByText(/Only Finance \/ Accountants may post journals/i)).toBeDefined();
  });

  it('Accountant role can post journal only when debits === credits (balanced)', async () => {
    // Mock Accountant permissions: holds JOURNAL_POST
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });

    const onSubmitPost = vi.fn().mockResolvedValue({});

    render(
      <JournalEntryModal
        isOpen={true}
        onClose={vi.fn()}
        accounts={testAccounts}
        onSubmitDraft={vi.fn()}
        onSubmitPost={onSubmitPost}
      />,
    );

    // Initially unbalanced -> Post button disabled
    const postBtn = screen.getByTestId('post-journal-btn');
    expect(postBtn).toBeDefined();
    expect(postBtn.hasAttribute('disabled')).toBe(true);

    // Set Narration
    fireEvent.change(screen.getByLabelText(/Voucher Narration/i), {
      target: { value: 'Office stationery payment' },
    });

    // Line 0: Select cash and enter Debit 10000
    const account0 = screen.getByTestId('line-account-0');
    fireEvent.change(account0, { target: { value: 'acc-cash' } });
    const debit0 = screen.getByTestId('line-debit-0');
    fireEvent.change(debit0, { target: { value: '10000' } });

    // Line 1: Select expense and enter Credit 10000
    const account1 = screen.getByTestId('line-account-1');
    fireEvent.change(account1, { target: { value: 'acc-office-exp' } });
    const credit1 = screen.getByTestId('line-credit-1');
    fireEvent.change(credit1, { target: { value: '10000' } });

    // Now balanced -> Post button enabled
    await waitFor(() => {
      expect(postBtn.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(postBtn);

    await waitFor(() => {
      expect(onSubmitPost).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'POST',
          narration: 'Office stationery payment',
        }),
      );
    });
  });

  it('renders JournalDrawer with PostingSeal for POSTED journals', () => {
    const onOpenReversal = vi.fn();
    render(
      <JournalDrawer
        journal={testJournals[0] || null}
        isOpen={true}
        onClose={vi.fn()}
        onOpenReversal={onOpenReversal}
      />,
    );

    // Must display the immutable PostingSeal component
    expect(screen.getByTestId('posting-seal')).toBeDefined();
    expect(screen.getByText('POSTED & SEALED')).toBeDefined();
    expect(screen.getByText('JV-2026-0001')).toBeDefined();

    // Voucher details
    expect(screen.getByText('Initial customer booking deposit for Plot 4A')).toBeDefined();
    expect(screen.getByText('Journal Line Postings')).toBeDefined();

    // Reverse action button available on posted journal
    const reverseBtn = screen.getByTestId('reverse-entry-btn');
    expect(reverseBtn).toBeDefined();
    fireEvent.click(reverseBtn);
    expect(onOpenReversal).toHaveBeenCalledWith(testJournals[0]);
  });

  it('renders JournalReversalModal and enforces min 10-char justification and step-up password', async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    render(
      <JournalReversalModal
        journal={testJournals[0] || null}
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Reverse Posted Journal Voucher')).toBeDefined();

    // Submitting without inputs displays validation errors
    const confirmBtn = screen.getByTestId('confirm-journal-reversal-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Reversal justification must be at least 10 characters'),
      ).toBeDefined();
      expect(screen.getByText('Step-up password confirmation is required')).toBeDefined();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    // Provide valid inputs
    fireEvent.change(screen.getByLabelText(/Reversal Justification/i), {
      target: { value: 'Erroneous account allocation confirmed by audit' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirm your operational password/i), {
      target: { value: 'SecretOperationalPass123!' },
    });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        journalId: 'jrn-001',
        reason: 'Erroneous account allocation confirmed by audit',
        stepUpPassword: 'SecretOperationalPass123!',
      });
    });
  });
});
