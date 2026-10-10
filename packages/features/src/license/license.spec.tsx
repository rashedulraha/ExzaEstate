import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LicenseStatusBanner } from './components/LicenseStatusBanner.js';
import { LicenseActivationModal } from './components/LicenseActivationModal.js';
import { LicenseRenewalModal } from './components/LicenseRenewalModal.js';
import { LicenseTransferModal } from './components/LicenseTransferModal.js';
import { LicenseSummaryCard } from './components/LicenseSummaryCard.js';
import { LicenseManagementPage } from './pages/LicenseManagementPage.js';
import { PlatformProvider, defaultPlatformAdapters } from '@exzaestate/app-core';

describe('Commercial Licensing Frontend Feature (B10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LicenseStatusBanner (AT-31 & BR-20)', () => {
    it('returns null when license status is ACTIVE', () => {
      const { container } = render(
        <LicenseStatusBanner
          status="ACTIVE"
          isWriteLocked={false}
          canExport={true}
          onOpenRenewModal={vi.fn()}
          onOpenActivateModal={vi.fn()}
          onExportData={vi.fn()}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders warning alert with days remaining when in GRACE period', () => {
      render(
        <LicenseStatusBanner
          status="GRACE"
          daysRemaining={4}
          isWriteLocked={false}
          canExport={true}
          onOpenRenewModal={vi.fn()}
          onOpenActivateModal={vi.fn()}
          onExportData={vi.fn()}
        />,
      );

      expect(screen.getByText('Subscription Grace Period Active')).toBeDefined();
      expect(screen.getByText(/4 days of full write access remain/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Renew Subscription/i })).toBeDefined();
    });

    it('locks writes when EXPIRED but ALWAYS offers Export All Data per BR-20', () => {
      const onExport = vi.fn();
      const onRenew = vi.fn();

      render(
        <LicenseStatusBanner
          status="EXPIRED"
          isWriteLocked={true}
          canExport={true}
          onOpenRenewModal={onRenew}
          onOpenActivateModal={vi.fn()}
          onExportData={onExport}
        />,
      );

      expect(screen.getByText(/License Expired — Read-Only Mode/i)).toBeDefined();
      const exportBtn = screen.getByRole('button', { name: /Export All Business Data/i });
      expect(exportBtn).toBeDefined();

      fireEvent.click(exportBtn);
      expect(onExport).toHaveBeenCalledTimes(1);

      const renewBtn = screen.getByRole('button', { name: /Renew Subscription/i });
      fireEvent.click(renewBtn);
      expect(onRenew).toHaveBeenCalledTimes(1);
    });

    it('displays clock rollback tampering alert with export enabled', () => {
      const onExport = vi.fn();

      render(
        <LicenseStatusBanner
          status="CLOCK_TAMPERED"
          isWriteLocked={true}
          canExport={true}
          onOpenRenewModal={vi.fn()}
          onOpenActivateModal={vi.fn()}
          onExportData={onExport}
        />,
      );

      expect(screen.getByText(/Clock Rollback Detected/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Export All Business Data/i })).toBeDefined();
    });
  });

  describe('LicenseActivationModal', () => {
    it('renders machine ID and submits activation form', async () => {
      const onActivate = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(
        <LicenseActivationModal
          isOpen={true}
          onClose={onClose}
          fingerprint={{
            machineId: '8f4c2b9a7d1e3f5a8b0c4e6d2f1a9b7c5e3d1f9a7b5c3d1e9f7a5b3c1d9e7f5a',
            motherboardUuid: 'MB-TEST-001',
            cpuSerial: 'CPU-TEST-001',
            diskSerial: 'DISK-TEST-001',
          }}
          onActivate={onActivate}
        />,
      );

      expect(screen.getByText(/Detected Workstation Machine ID/i)).toBeDefined();
      expect(screen.getByText(/8f4c2b9a7d1e3f5a/i)).toBeDefined();

      fireEvent.change(screen.getByLabelText(/Tenant Company ID/i), {
        target: { value: 'company-uuid-123' },
      });
      fireEvent.change(screen.getByLabelText(/License Key/i), {
        target: { value: 'EXZA-PRO-1234-5678-9012' },
      });
      fireEvent.change(screen.getByLabelText(/Cryptographic Ed25519 Signature/i), {
        target: { value: 'VALID_BASE64URL_SIGNATURE_KEY_BYTES' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Verify & Activate/i }));

      await waitFor(() => {
        expect(onActivate).toHaveBeenCalledWith(
          expect.objectContaining({
            companyId: 'company-uuid-123',
            licenseKey: 'EXZA-PRO-1234-5678-9012',
            signature: 'VALID_BASE64URL_SIGNATURE_KEY_BYTES',
          }),
        );
      });
    });
  });

  describe('LicenseRenewalModal', () => {
    it('displays renewal request code and submits renewal form', async () => {
      const onRenew = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();

      render(
        <LicenseRenewalModal
          isOpen={true}
          onClose={onClose}
          renewalRequestCode="EXZA-REQ-8F4C2B9A-COMPANY0-ENTERPRISE-RNW01"
          onRenew={onRenew}
        />,
      );

      expect(screen.getByText('EXZA-REQ-8F4C2B9A-COMPANY0-ENTERPRISE-RNW01')).toBeDefined();

      fireEvent.change(screen.getByLabelText(/Renewed License Key/i), {
        target: { value: 'EXZA-PRO-RENEWED-KEY-9999' },
      });
      fireEvent.change(screen.getByLabelText(/New Cryptographic Signature/i), {
        target: { value: 'NEW_VALID_SIGNATURE_BYTES' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Apply Renewal/i }));

      await waitFor(() => {
        expect(onRenew).toHaveBeenCalledWith(
          expect.objectContaining({
            licenseKey: 'EXZA-PRO-RENEWED-KEY-9999',
            signature: 'NEW_VALID_SIGNATURE_BYTES',
          }),
        );
      });
    });
  });

  describe('LicenseTransferModal (Gate D-15)', () => {
    it('explains 2 transfers/year policy and submits transfer request', async () => {
      const onTransfer = vi.fn().mockResolvedValue({
        success: true,
        message: 'Transfer registered successfully',
      });
      const onClose = vi.fn();

      render(
        <LicenseTransferModal
          isOpen={true}
          onClose={onClose}
          currentLicenseKey="EXZA-PRO-ORIGINAL"
          onTransfer={onTransfer}
        />,
      );

      expect(screen.getByText(/2 transfer requests per calendar year/i)).toBeDefined();
      expect(screen.getByText(/≥ 2 of 3 identifiers match/i)).toBeDefined();

      fireEvent.change(screen.getByLabelText(/Hardware Maintenance Reason/i), {
        target: { value: 'Replaced failed primary hard disk drive' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Submit Transfer Request/i }));

      await waitFor(() => {
        expect(onTransfer).toHaveBeenCalledWith(
          expect.objectContaining({
            licenseKey: 'EXZA-PRO-ORIGINAL',
            reason: 'Replaced failed primary hard disk drive',
          }),
        );
      });
    });
  });

  describe('LicenseSummaryCard & LicenseManagementPage', () => {
    it('renders license summary card with bound hardware components', () => {
      render(
        <LicenseSummaryCard
          status="ACTIVE"
          license={{
            payload: {
              companyId: 'comp-1',
              kid: 'exza-ed25519-v1',
              machineId: '8f4c2b9a7d1e3f5a',
              maxSeats: 10,
              plan: 'ENTERPRISE',
              validUntil: '2027-12-31T00:00:00Z',
            },
            signature: 'sig',
          }}
          fingerprint={{
            machineId: '8f4c2b9a7d1e3f5a',
            motherboardUuid: 'MB-001',
            cpuSerial: 'CPU-001',
            diskSerial: 'DISK-001',
          }}
          isWriteLocked={false}
          canExport={true}
          onOpenActivate={vi.fn()}
          onOpenRenew={vi.fn()}
          onOpenTransfer={vi.fn()}
          onExportData={vi.fn()}
        />,
      );

      expect(screen.getByText('Commercial License')).toBeDefined();
      expect(screen.getByText('Active License')).toBeDefined();
      expect(screen.getByText('ENTERPRISE')).toBeDefined();
      expect(screen.getByText('10 Seats')).toBeDefined();
      expect(screen.getByText('Full Access')).toBeDefined();
      expect(screen.getByText('MB-001')).toBeDefined();
    });

    it('renders full LicenseManagementPage in PlatformProvider', async () => {
      render(
        <PlatformProvider adapters={defaultPlatformAdapters}>
          <LicenseManagementPage />
        </PlatformProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Commercial Workstation Licensing')).toBeDefined();
      });

      expect(screen.getByText('License Grace Period')).toBeDefined();
      expect(screen.getByText('Data Retention & Accessibility Guarantee')).toBeDefined();
      expect(screen.getByText('Hardware Flexibility Policy')).toBeDefined();
    });
  });
});
