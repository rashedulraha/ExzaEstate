import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetupChecklistPage } from './pages/SetupChecklistPage.js';
import { SetupProgressBar } from './components/SetupProgressBar.js';
import { TransactReadyBanner } from './components/TransactReadyBanner.js';
import type { SetupChecklistResult } from './schemas/setup.schema.js';

const mockChecklistSummary: SetupChecklistResult = {
  canTransact: false,
  completedCount: 3,
  totalCount: 5,
  percentage: 60,
  items: [
    {
      key: 'company-info',
      title: 'Company Identity & Registration',
      description: 'Set company trade license, TIN, BIN, and registered address',
      isCompleted: true,
      isMandatory: true,
    },
    {
      key: 'chart-of-accounts',
      title: 'Chart of Accounts Baseline',
      description: 'Import or generate standard 4-digit Chart of Accounts',
      isCompleted: false,
      isMandatory: true,
    },
    {
      key: 'first-project',
      title: 'Register Primary Real Estate Project',
      description: 'Define master project with Rajuk approval and handover date',
      isCompleted: true,
      isMandatory: true,
    },
  ],
};

vi.mock('@exzaestate/api-client', () => ({
  useSetupChecklistControllerGetChecklist: () => ({
    data: mockChecklistSummary,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import { MemoryRouter } from 'react-router';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Setup Checklist Module (FLOW-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SetupChecklistPage', () => {
    it('renders checklist wizard with categories and items', () => {
      renderWithClient(<SetupChecklistPage />);

      expect(screen.getByText('Company Setup Checklist')).toBeDefined();
      expect(screen.getByText(/60% Completed/i)).toBeDefined();
      expect(screen.getByText(/3 of 5 Requirements Satisfied/i)).toBeDefined();
      expect(screen.getByText('Company Identity & Registration')).toBeDefined();
      expect(screen.getByText('Chart of Accounts Baseline')).toBeDefined();
    });

    it('displays Pending Transact-Ready banner when mandatory steps incomplete', () => {
      renderWithClient(<SetupChecklistPage />);

      expect(screen.getByText('Setup Action Required')).toBeDefined();
    });
  });

  describe('TransactReadyBanner', () => {
    it('renders green Transact-Ready badge when canTransact is true', () => {
      render(<TransactReadyBanner canTransact={true} />);

      expect(screen.getByText('Enterprise Ready to Transact')).toBeDefined();
      expect(screen.getByText(/All mandatory onboarding steps/i)).toBeDefined();
    });
  });

  describe('SetupProgressBar', () => {
    it('renders progress percentage and step counts', () => {
      render(<SetupProgressBar percentage={75} completedCount={3} totalCount={4} />);

      expect(screen.getByText('75% Completed')).toBeDefined();
      expect(screen.getByText('3 of 4 Requirements Satisfied')).toBeDefined();
    });
  });
});
