import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PlatformProvider, defaultPlatformAdapters } from '@exzaestate/app-core';
import { ModeSelectionCard } from './components/ModeSelectionCard.js';
import { CloudSetupSection } from './components/CloudSetupSection.js';
import { LocalSetupSection } from './components/LocalSetupSection.js';
import { BackupBanner } from './components/BackupBanner.js';
import { BackupModal } from './components/BackupModal.js';
import { RestoreModal } from './components/RestoreModal.js';
import { FirstLaunchSummary } from './components/FirstLaunchSummary.js';
import { FirstLaunchWizardPage } from './pages/FirstLaunchWizardPage.js';

function renderWithPlatform(ui: React.ReactElement) {
  return render(
    <PlatformProvider adapters={defaultPlatformAdapters}>
      <MemoryRouter>{ui}</MemoryRouter>
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
      expect(screen.getByText('Embedded Postgres')).toBeDefined();

      const localOption = screen.getByText('Local Standalone (100% Offline)');
      fireEvent.click(localOption);
      expect(onSelect).toHaveBeenCalledWith('local');
    });
  });

  describe('CloudSetupSection', () => {
    it('renders server url input and connection test button', async () => {
      const onConfirm = vi.fn();
      render(<CloudSetupSection onConfirm={onConfirm} />);

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
    });
  });

  describe('LocalSetupSection', () => {
    it('switches between New Company and Restore Backup tabs', () => {
      const onCreate = vi.fn();
      const onRestore = vi.fn();
      render(
        <LocalSetupSection
          onCreateCompany={onCreate}
          onRestoreBackup={onRestore}
          isLoading={false}
        />,
      );

      expect(screen.getByLabelText(/Company \/ Enterprise Name/i)).toBeDefined();
      expect(screen.getByLabelText(/Managing Director \/ Admin Name/i)).toBeDefined();

      const restoreTab = screen.getByRole('button', { name: 'Restore Backup' });
      fireEvent.click(restoreTab);

      expect(screen.getByLabelText(/Select Backup Archive/i)).toBeDefined();
      expect(screen.getByText(/Destructive Operation:/i)).toBeDefined();
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
      expect(screen.getByText(/Local Standalone engine is ready/i)).toBeDefined();
      expect(screen.getByText('ENFORCED (RULE-IMMUTABLE)')).toBeDefined();

      const proceedBtn = screen.getByRole('button', { name: /Proceed to Sign In/i });
      fireEvent.click(proceedBtn);
      expect(onProceed).toHaveBeenCalled();
    });
  });

  describe('FirstLaunchWizardPage', () => {
    it('renders wizard layout with step indicator', () => {
      renderWithPlatform(<FirstLaunchWizardPage />);

      expect(screen.getByText('Initial Deployment Wizard')).toBeDefined();
      expect(screen.getByText('Choose Mode')).toBeDefined();
      expect(screen.getByText('Configure Engine')).toBeDefined();
      expect(screen.getByText('Ready')).toBeDefined();
      expect(screen.getByText('Choose Runtime Engine')).toBeDefined();
    });
  });
});
