import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import {
  PlatformProvider,
  AuthProvider,
  defaultPlatformAdapters,
  InMemorySecureStorage,
} from '@exzaestate/app-core';
import { http } from '@exzaestate/api-client';
import { ModeSelectionCard } from './components/ModeSelectionCard.js';
import { CloudSetupSection } from './components/CloudSetupSection.js';
import { LocalSetupSection } from './components/LocalSetupSection.js';
import { BackupBanner } from './components/BackupBanner.js';
import { BackupModal } from './components/BackupModal.js';
import { RestoreModal } from './components/RestoreModal.js';
import { FirstLaunchSummary } from './components/FirstLaunchSummary.js';
import { FirstLaunchWizardPage } from './pages/FirstLaunchWizardPage.js';

function renderWithPlatform(ui: React.ReactElement) {
  const adapters = {
    ...defaultPlatformAdapters,
    secureStorage: new InMemorySecureStorage(),
  };
  return render(
    <PlatformProvider adapters={adapters}>
      <AuthProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthProvider>
    </PlatformProvider>,
  );
}

describe('First-Launch Wizard & Local Standalone (Task B9)', () => {
  describe('ModeSelectionCard', () => {
    it('renders both Cloud-Hosted and Local Standalone mode options', () => {
      const onSelect = vi.fn();
      render(<ModeSelectionCard selectedMode="cloud" onSelectMode={onSelect} />);

      expect(screen.getByText('Cloud-Hosted Multi-User')).toBeDefined();
      expect(screen.getByText('Local Standalone (100% Offline)')).toBeDefined();

      const localOption = screen.getByText('Local Standalone (100% Offline)');
      fireEvent.click(localOption);
      expect(onSelect).toHaveBeenCalledWith('local');
    });
  });

  describe('CloudSetupSection', () => {
    it('renders server url input and connection test button', async () => {
      const getSpy = vi.spyOn(http, 'get').mockResolvedValue({ status: 'ok' });
      const onConfirm = vi.fn();
      render(
        <CloudSetupSection
          onConfirm={onConfirm}
          initialShowAdvanced={true}
          initialCompanyName="Exzazon Real Estate Ltd."
          initialLicenseKey="EXZA-ENTERPRISE-2026-ABCD"
        />,
      );

      expect(screen.getByLabelText(/Legal Company Name/i)).toBeDefined();
      expect(screen.getByLabelText(/Software Purchase License Key/i)).toBeDefined();
      expect(screen.getByLabelText(/Enterprise Server URL/i)).toBeDefined();
      const testBtn = screen.getByRole('button', { name: /Test Connection/i });
      fireEvent.click(testBtn);

      await waitFor(() => {
        expect(screen.getByText(/verified/i)).toBeDefined();
      });

      const submitBtn = screen.getByRole('button', { name: /Save & Connect to Cloud/i });
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });
      getSpy.mockRestore();
    });
  });

  describe('LocalSetupSection', () => {
    it('renders local setup form with explicit organization and administrator fields', () => {
      const onCreate = vi.fn();
      render(<LocalSetupSection onCreateCompany={onCreate} isLoading={false} />);

      expect(screen.getByText('Local Standalone Workspace Setup')).toBeDefined();
      expect(screen.getByLabelText(/Legal Company Name/i)).toBeDefined();
      expect(screen.getByLabelText(/Company Code/i)).toBeDefined();
      expect(screen.getByLabelText(/Administrator Full Name/i)).toBeDefined();
      expect(screen.getByLabelText(/Administrator Email/i)).toBeDefined();
      expect(screen.getByLabelText(/Master Password/i)).toBeDefined();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeDefined();
      expect(screen.getByLabelText(/Software Purchase License Key/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Install & Launch Workspace/i })).toBeDefined();
      expect(screen.getByText(/Hardware-Bound Lock Active/i)).toBeDefined();
    });

    it('displays validation errors on screen and blocks submission when required fields are missing', async () => {
      const onCreate = vi.fn();
      render(<LocalSetupSection onCreateCompany={onCreate} isLoading={false} />);

      const submitBtn = screen.getByRole('button', { name: /Install & Launch Workspace/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Company name must be at least 2 characters/i)).toBeDefined();
        expect(screen.getByText(/Administrator full name is required/i)).toBeDefined();
        expect(screen.getByText(/Valid administrator email address is required/i)).toBeDefined();
        expect(
          screen.getByText(/Administrator password must be at least 8 characters/i),
        ).toBeDefined();
      });

      expect(onCreate).not.toHaveBeenCalled();
    });
  });

  describe('BackupBanner', () => {
    it('renders 7-day warning banner when last backup is overdue or missing', () => {
      // 10 days ago
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const { rerender } = renderWithPlatform(
        <BackupBanner lastBackupDate={tenDaysAgo} totalBackupsCount={1} />,
      );

      expect(screen.getByText(/Database Backup Recommended/i)).toBeDefined();
      expect(screen.getByText(/exceeds 7-day threshold/i)).toBeDefined();

      // Recent backup (< 7 days) -> Banner should be hidden
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      rerender(
        <PlatformProvider adapters={defaultPlatformAdapters}>
          <MemoryRouter>
            <BackupBanner lastBackupDate={yesterday} totalBackupsCount={3} />
          </MemoryRouter>
        </PlatformProvider>,
      );

      expect(screen.queryByText(/Database Backup Recommended/i)).toBeNull();
    });
  });

  describe('BackupModal & RestoreModal', () => {
    it('renders BackupModal with destination and trigger', () => {
      const onClose = vi.fn();
      renderWithPlatform(<BackupModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText('Create Local Database Backup')).toBeDefined();
      expect(screen.getByLabelText(/Backup Destination Path/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Create Backup Now/i })).toBeDefined();
    });

    it('renders RestoreModal with destructive confirmation warning', () => {
      const onClose = vi.fn();
      renderWithPlatform(<RestoreModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText('Restore Database from Backup')).toBeDefined();
      expect(screen.getByLabelText(/Backup Archive Path/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Confirm & Restore/i })).toBeDefined();
    });
  });

  describe('FirstLaunchSummary', () => {
    it('renders completion screen with proceed button', () => {
      const onProceed = vi.fn();
      render(<FirstLaunchSummary mode="local" onProceedToLogin={onProceed} />);

      expect(screen.getByText('Workspace Initialized')).toBeDefined();
      expect(screen.getByText(/local enterprise workspace is provisioned/i)).toBeDefined();
      expect(screen.getByText(/Double-Entry & Audit Protected/i)).toBeDefined();

      const proceedBtn = screen.getByRole('button', { name: /Launch Executive Dashboard/i });
      fireEvent.click(proceedBtn);
      expect(onProceed).toHaveBeenCalled();
    });
  });

  describe('FirstLaunchWizardPage', () => {
    it('renders wizard layout and advances to mode selection', () => {
      renderWithPlatform(<FirstLaunchWizardPage />);

      expect(screen.getByText('Welcome to ExzaEstate')).toBeDefined();

      const getStartedBtn = screen.getByRole('button', { name: /Get Started/i });
      fireEvent.click(getStartedBtn);
      expect(screen.getByText('Choose How to Run ExzaEstate')).toBeDefined();
    });
  });
});
