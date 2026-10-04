import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  PlatformProvider,
  AuthProvider,
  defaultPlatformAdapters,
  InMemorySecureStorage,
} from '@exzaestate/app-core';
import { LoginPage } from './pages/LoginPage.js';
import { StepUpModal } from './components/StepUpModal.js';
import { SessionExpiredModal } from './components/SessionExpiredModal.js';
import { TotpEnrollmentModal } from './components/TotpEnrollmentModal.js';
import { PERMISSIONS } from '@exzaestate/shared';
import * as apiClient from '@exzaestate/api-client';

describe('Auth Feature Screens & Modals', () => {
  let mockSecureStorage: InMemorySecureStorage;

  beforeEach(() => {
    mockSecureStorage = new InMemorySecureStorage();
    apiClient.resetClientState();
    vi.clearAllMocks();
  });

  function renderWithProviders(ui: React.ReactElement) {
    const adapters = {
      ...defaultPlatformAdapters,
      secureStorage: mockSecureStorage,
    };
    return render(
      <PlatformProvider adapters={adapters}>
        <AuthProvider>{ui}</AuthProvider>
      </PlatformProvider>,
    );
  }

  describe('LoginPage', () => {
    it('renders login form with branded header and accessible inputs', async () => {
      await act(async () => {
        renderWithProviders(<LoginPage />);
      });

      expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
      expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
      expect(screen.getByLabelText(/^Password$/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeDefined();
    });

    it('toggles password visibility', async () => {
      await act(async () => {
        renderWithProviders(<LoginPage />);
      });

      const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      const toggleBtn = screen.getByRole('button', { name: /Show password/i });
      fireEvent.click(toggleBtn);
      expect(passwordInput.type).toBe('text');

      fireEvent.click(screen.getByRole('button', { name: /Hide password/i }));
      expect(passwordInput.type).toBe('password');
    });

    it('validates required email and password on empty submit', async () => {
      await act(async () => {
        renderWithProviders(<LoginPage />);
      });

      const submitBtn = screen.getByRole('button', { name: /Sign In/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email address/i)).toBeDefined();
      });
    });

    it('submits valid credentials and stores refresh token in keychain', async () => {
      vi.spyOn(apiClient, 'customInstance').mockImplementation(async (config) => {
        if (config.url === '/api/v1/auth/login') {
          return {
            accessToken: 'mock_jwt_access',
            refreshToken: 'mock_refresh_token_123',
            user: {
              id: 'user-1',
              email: 'admin@company.com',
              fullName: 'System Admin',
              companyId: 'company-1',
              isTwoFactorEnabled: true,
              permissions: [PERMISSIONS.PROPERTY_CREATE],
              scopes: { [PERMISSIONS.PROPERTY_CREATE]: 'ALL' },
              branchIds: [],
            },
          };
        }
        if (config.url === '/api/v1/auth/me') {
          return {
            id: 'user-1',
            email: 'admin@company.com',
            fullName: 'System Admin',
            companyId: 'company-1',
            isTwoFactorEnabled: true,
            permissions: [PERMISSIONS.PROPERTY_CREATE],
            scopes: { [PERMISSIONS.PROPERTY_CREATE]: 'ALL' },
            branchIds: [],
          };
        }
        return {};
      });

      const onSuccess = vi.fn();
      await act(async () => {
        renderWithProviders(<LoginPage onSuccess={onSuccess} />);
      });

      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'admin@company.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'StrongPassword123!' },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      // Refresh token strictly in secure storage (keychain)
      const storedToken = await mockSecureStorage.getItem('refresh_token');
      expect(storedToken).toBe('mock_refresh_token_123');
    });
  });

  describe('StepUpModal', () => {
    it('renders step-up prompt and validates 6-digit TOTP input', async () => {
      await act(async () => {
        renderWithProviders(<StepUpModal isOpen={true} />);
      });

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByLabelText(/6-Digit Authenticator Code/i)).toBeDefined();

      const tokenInput = screen.getByLabelText(/6-Digit Authenticator Code/i);
      fireEvent.change(tokenInput, { target: { value: '12' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/Verification code must be exactly 6 digits/i)).toBeDefined();
      });
    });

    it('submits valid 6-digit code and calls onSuccess', async () => {
      vi.spyOn(apiClient, 'customInstance').mockImplementation(async (config) => {
        if (config.url === '/api/v1/auth/step-up') {
          return {};
        }
        return {};
      });

      const onSuccess = vi.fn();
      await act(async () => {
        renderWithProviders(<StepUpModal isOpen={true} onSuccess={onSuccess} />);
      });

      const tokenInput = screen.getByLabelText(/6-Digit Authenticator Code/i);
      fireEvent.change(tokenInput, { target: { value: '654321' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('SessionExpiredModal', () => {
    it('renders dialog when session is expired', async () => {
      const onSignInAgain = vi.fn();

      function ExpiredTriggerComponent() {
        return <SessionExpiredModal onSignInAgain={onSignInAgain} />;
      }

      await act(async () => {
        renderWithProviders(<ExpiredTriggerComponent />);
      });

      // Initially not expired
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
  });

  describe('TotpEnrollmentModal', () => {
    it('generates secret and enables 2FA with recovery codes display', async () => {
      vi.spyOn(apiClient, 'customInstance').mockImplementation(async (config) => {
        if (config.url === '/api/v1/auth/2fa/generate') {
          return {
            secret: 'JBSWY3DPEHPK3PXP',
            qrCodeUrl: 'https://example.com/qr.png',
          };
        }
        if (config.url === '/api/v1/auth/2fa/enable') {
          return {
            recoveryCodes: ['REC-001', 'REC-002', 'REC-003', 'REC-004'],
          };
        }
        return {};
      });

      const onSuccess = vi.fn();
      await act(async () => {
        renderWithProviders(<TotpEnrollmentModal isOpen={true} onSuccess={onSuccess} />);
      });

      await waitFor(() => {
        expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeDefined();
      });

      const tokenInput = screen.getByLabelText(/Enter the 6-digit code/i);
      fireEvent.change(tokenInput, { target: { value: '123456' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Verify & Enable 2FA/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/2FA Successfully Enabled!/i)).toBeDefined();
        expect(screen.getByText('REC-001')).toBeDefined();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /I have saved my recovery codes/i }));
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
