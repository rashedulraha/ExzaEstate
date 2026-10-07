import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsPage } from './pages/SettingsPage.js';
import { NumberingPreviewCard } from './components/NumberingPreviewCard.js';

const mockCompanySettings = {
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
  dateFormat: 'DD/MM/YYYY',
  fiscalYearStartMonth: 7,
  gracePeriodDays: 15,
  defaultLateFeePaisa: '50000',
  autoReversalApprovalRequired: true,
  twoFactorEnforced: true,
  smsNotificationEnabled: true,
  emailNotificationEnabled: true,
};

const mockPatterns = [
  {
    id: 'pat-1',
    companyId: 'comp-1',
    documentType: 'BOOKING',
    prefix: 'BK',
    pattern: '{PREFIX}-{YEAR}-{SEQ:5}',
    nextNumber: 101,
    resetRule: 'FISCAL_YEARLY' as const,
    isActive: true,
  },
  {
    id: 'pat-2',
    companyId: 'comp-1',
    documentType: 'PAYMENT_RECEIPT',
    prefix: 'MR',
    pattern: '{PREFIX}-{YEAR}{MONTH}-{SEQ:6}',
    nextNumber: 42,
    resetRule: 'YEARLY' as const,
    isActive: true,
  },
];

vi.mock('@exzaestate/api-client', () => ({
  useSettingsControllerGetAllSettings: () => ({
    data: mockCompanySettings,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useSettingsControllerUpdateSetting: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSettingsControllerUpdateBatch: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useNumberingControllerListPatterns: () => ({
    data: mockPatterns,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useNumberingControllerUpdatePattern: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useNumberingControllerPreview: () => ({
    data: { formattedExample: 'RECEIPT-DHK-2026-000001' },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@exzaestate/app-core', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-12345678',
      fullName: 'Anwar Hossain',
      email: 'md@exzaestate.com',
      companyId: 'comp-1',
      companyName: 'ExzaEstate Development Ltd.',
      isTwoFactorEnabled: true,
      permissions: ['*'],
      scopes: { role: 'Managing Director' },
      branchIds: [],
    },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
    logoutAll: vi.fn(),
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

describe('Settings & Numbering Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SettingsPage', () => {
    it('renders general settings by default', () => {
      renderWithClient(<SettingsPage />);

      expect(screen.getByText('Company Settings & Policies')).toBeDefined();
      expect(screen.getByText('General & Land')).toBeDefined();
      expect(screen.getByText('Sales & Booking')).toBeDefined();
      expect(screen.getByText('Accounting & Finance')).toBeDefined();
      expect(screen.getByText('Numbering Patterns')).toBeDefined();

      // Check General Policy fields
      expect(screen.getByText('Fiscal Year Start Month')).toBeDefined();
      expect(screen.getByText('Nightly Maintenance Job Time')).toBeDefined();
      expect(screen.getByText('Decimal (Shotok)')).toBeDefined();
      expect(screen.getByText('Katha')).toBeDefined();
    });

    it('switches to Sales Policies tab', () => {
      renderWithClient(<SettingsPage />);

      const tab = screen.getByText('Sales & Booking');
      fireEvent.click(tab);

      expect(screen.getByText('Minimum Booking %')).toBeDefined();
      expect(screen.getByText('Reservation Hold Hours')).toBeDefined();
    });

    it('switches to Accounting & Finance tab', () => {
      renderWithClient(<SettingsPage />);

      const tab = screen.getByText('Accounting & Finance');
      fireEvent.click(tab);

      expect(screen.getByText('Revenue Recognition Policy')).toBeDefined();
      expect(screen.getByText('Cheque Posting Timing')).toBeDefined();
    });

    it('switches to Numbering Patterns tab and renders table', () => {
      renderWithClient(<SettingsPage />);

      const tab = screen.getByText('Numbering Patterns');
      fireEvent.click(tab);

      expect(screen.getByText('Configured Document Series')).toBeDefined();
      expect(screen.getByText('BOOKING')).toBeDefined();
      expect(screen.getByText('{PREFIX}-{YEAR}-{SEQ:5}')).toBeDefined();
      expect(screen.getByText('PAYMENT_RECEIPT')).toBeDefined();
    });

    it('switches to Profile & Account tab and renders session controls and buttons', () => {
      renderWithClient(<SettingsPage />);

      const tab = screen.getByText('Profile & Account');
      fireEvent.click(tab);

      expect(screen.getByText('Account Security & Verification')).toBeDefined();
      expect(screen.getByText('Meridian Saffron')).toBeDefined();
      expect(screen.getByText('Emerald Estate')).toBeDefined();
      expect(screen.getByText('Account Session Controls')).toBeDefined();
      expect(screen.getByText('Sign Out of Session')).toBeDefined();
      expect(screen.getByText('Switch Account / Log In As Another User')).toBeDefined();
      expect(screen.getByText('Revoke All Other Sessions')).toBeDefined();
    });
  });

  describe('NumberingPreviewCard', () => {
    it('renders real-time formatted preview', () => {
      renderWithClient(<NumberingPreviewCard />);

      expect(screen.getByText('Numbering Pattern Sandbox')).toBeDefined();
      expect(screen.getByText('Evaluated Live Result')).toBeDefined();
      expect(screen.getByText('RECEIPT-DHK-2026-000001')).toBeDefined();
    });
  });
});
