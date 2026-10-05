import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MigrationWizardPage } from './pages/MigrationWizardPage.js';
import { ReconciliationGateCard } from './components/ReconciliationGateCard.js';
import type { ReconciliationGateResult } from './schemas/migration.schema.js';

const mockReconciliationSuccess: ReconciliationGateResult = {
  batchId: 'batch-001',
  canFinalize: true,
  totalOpeningArPaisa: '500000000',
  totalOpeningArFormatted: '৳50,00,000.00',
  totalLegacyOutstandingPaisa: '500000000',
  totalLegacyOutstandingFormatted: '৳50,00,000.00',
  differencePaisa: '0',
  differenceFormatted: '৳0.00',
  customerDifferences: [
    {
      customerId: 'cust-1',
      customerName: 'Tanvir Hossain',
      openingArPaisa: '500000000',
      legacyOutstandingPaisa: '500000000',
      differencePaisa: '0',
      isReconciled: true,
    },
  ],
};

const mockReconciliationFailure: ReconciliationGateResult = {
  batchId: 'batch-002',
  canFinalize: false,
  totalOpeningArPaisa: '500000000',
  totalOpeningArFormatted: '৳50,00,000.00',
  totalLegacyOutstandingPaisa: '480000000',
  totalLegacyOutstandingFormatted: '৳48,00,000.00',
  differencePaisa: '20000000',
  differenceFormatted: '৳2,00,000.00',
  customerDifferences: [
    {
      customerId: 'cust-2',
      customerName: 'Anisul Huq',
      openingArPaisa: '500000000',
      legacyOutstandingPaisa: '480000000',
      differencePaisa: '20000000',
      isReconciled: false,
    },
  ],
};

vi.mock('@exzaestate/api-client', () => ({
  useMigrationControllerGetReconciliationGate: () => ({
    data: mockReconciliationSuccess,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useMigrationControllerCreateBatch: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      id: 'batch-001',
      name: 'FY2026 Cutover Batch',
      status: 'DRAFT',
    }),
    isPending: false,
  }),
  useMigrationControllerPostOpeningBalance: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useMigrationControllerAddLegacyBooking: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useMigrationControllerFinalizeBatch: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCsvMigrationControllerValidate: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCsvMigrationControllerImport: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Go-Live Migration Wizard (FLOW-03 & AT-29)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MigrationWizardPage', () => {
    it('renders initial migration batch setup view', () => {
      renderWithClient(<MigrationWizardPage />);

      expect(screen.getByText('Go-Live Data Migration Wizard')).toBeDefined();
      expect(screen.getByText('Initialize Go-Live Migration Batch')).toBeDefined();
      expect(screen.getByRole('button', { name: /Initialize Migration Batch/i })).toBeDefined();
    });

    it('creates batch and displays wizard steps', async () => {
      renderWithClient(<MigrationWizardPage />);

      const createBtn = screen.getByRole('button', { name: /Initialize Migration Batch/i });
      fireEvent.click(createBtn);

      // Should transition to active batch and show step 1
      expect(await screen.findByText('1. Opening Balances')).toBeDefined();
      expect(screen.getByText('2. Legacy Bookings')).toBeDefined();
      expect(screen.getByText('3. Bulk CSV Import')).toBeDefined();
      expect(screen.getByText('4. Reconciliation Gate')).toBeDefined();
    });
  });

  describe('ReconciliationGateCard (AT-29)', () => {
    it('renders confirmed status and allows finalization when perfectly reconciled (৳0.00 difference)', () => {
      const onFinalize = vi.fn();
      render(
        <ReconciliationGateCard
          reconciliation={mockReconciliationSuccess}
          onOpenFinalize={onFinalize}
          onRefresh={vi.fn()}
          isLoading={false}
        />,
      );

      expect(screen.getByText('Step 4: Reconciliation Gate (AT-29)')).toBeDefined();
      expect(screen.getByText('CONFIRMED')).toBeDefined();
      expect(screen.getAllByText('৳50,00,000.00')[0]).toBeDefined();
      expect(screen.getAllByText('৳0.00')[0]).toBeDefined();
      expect(screen.getByText('Tanvir Hossain')).toBeDefined();

      const finalizeBtn = screen.getByRole('button', { name: /Finalize Migration/i });
      expect((finalizeBtn as HTMLButtonElement).disabled).toBe(false);

      fireEvent.click(finalizeBtn);
      expect(onFinalize).toHaveBeenCalledTimes(1);
    });

    it('renders rejected status and disables finalize when discrepancy exists', () => {
      render(
        <ReconciliationGateCard
          reconciliation={mockReconciliationFailure}
          onOpenFinalize={vi.fn()}
          onRefresh={vi.fn()}
          isLoading={false}
        />,
      );

      expect(screen.getByText('REJECTED')).toBeDefined();
      expect(screen.getAllByText('৳2,00,000.00')[0]).toBeDefined();
      expect(screen.getByText('Anisul Huq')).toBeDefined();

      const finalizeBtn = screen.getByRole('button', { name: /Finalize Migration/i });
      expect((finalizeBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
