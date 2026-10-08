import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  PlatformProvider,
  usePlatform,
  InMemorySecureStorage,
  defaultPlatformAdapters,
  AuthProvider,
  usePermission,
  PermissionGate,
  getErrorMessage,
  getErrorCode,
  isStepUpRequired,
  isTwoFactorRequired,
  isSessionExpired,
  useCurrency,
  useDateFormat,
} from './index.js';
import { ApiError, resetClientState } from '@exzaestate/api-client';
import { ERROR_CODES, PERMISSIONS } from '@exzaestate/shared';

describe('packages/app-core', () => {
  beforeEach(() => {
    resetClientState();
    vi.clearAllMocks();
  });

  describe('PlatformProvider & Adapters', () => {
    it('provides default adapters and in-memory secure storage works', async () => {
      const storage = new InMemorySecureStorage();
      await storage.setItem('test_token', 'secret123');
      expect(await storage.getItem('test_token')).toBe('secret123');

      await storage.removeItem('test_token');
      expect(await storage.getItem('test_token')).toBeNull();
    });

    it('usePlatform exposes the platform adapters context', () => {
      let resolvedBaseUrl = '';
      function TestComponent() {
        const platform = usePlatform();
        resolvedBaseUrl = platform.apiConfig.baseUrl;
        return <div>Base: {resolvedBaseUrl}</div>;
      }

      const customAdapters = {
        ...defaultPlatformAdapters,
        apiConfig: {
          ...defaultPlatformAdapters.apiConfig,
          baseUrl: 'https://api.exzaestate.com',
        },
      };

      render(
        <PlatformProvider adapters={customAdapters}>
          <TestComponent />
        </PlatformProvider>,
      );

      expect(resolvedBaseUrl).toBe('https://api.exzaestate.com');
    });
  });

  describe('Permissions: usePermission & PermissionGate', () => {
    function PermissionTester({
      permission,
      requiredScope,
    }: {
      permission: string;
      requiredScope?: 'OWN' | 'TEAM' | 'BRANCH' | 'ALL';
    }) {
      const { hasPermission, scope } = usePermission(permission, requiredScope);
      return (
        <div>
          <span data-testid="has-perm">{hasPermission ? 'yes' : 'no'}</span>
          <span data-testid="scope">{scope ?? 'none'}</span>
        </div>
      );
    }

    it('denies permission when user is not logged in', async () => {
      await act(async () => {
        render(
          <PlatformProvider adapters={defaultPlatformAdapters}>
            <AuthProvider>
              <PermissionTester permission={PERMISSIONS.PROPERTY_CREATE} />
            </AuthProvider>
          </PlatformProvider>,
        );
      });

      expect(screen.getByTestId('has-perm').textContent).toBe('no');
      expect(screen.getByTestId('scope').textContent).toBe('none');
    });

    it('renders fallback when permission is missing in PermissionGate', async () => {
      await act(async () => {
        render(
          <PlatformProvider adapters={defaultPlatformAdapters}>
            <AuthProvider>
              <PermissionGate
                permission={PERMISSIONS.PROPERTY_CREATE}
                fallback={<div data-testid="fallback">No access</div>}
              >
                <div data-testid="protected">Secret Content</div>
              </PermissionGate>
            </AuthProvider>
          </PlatformProvider>,
        );
      });

      expect(screen.getByTestId('fallback').textContent).toBe('No access');
      expect(screen.queryByTestId('protected')).toBeNull();
    });
  });

  describe('Errors & Error Codes', () => {
    it('translates known error codes to domain messages', () => {
      const error = new ApiError(ERROR_CODES.UNAUTHORIZED, 'Session expired', 401);
      expect(getErrorCode(error)).toBe(ERROR_CODES.UNAUTHORIZED);
      expect(getErrorMessage(error)).toBe('Your session has expired. Please sign in again.');
      expect(isSessionExpired(error)).toBe(true);
    });

    it('identifies step-up and two-factor requirement error codes', () => {
      const stepUpErr = new ApiError(ERROR_CODES.STEP_UP_REQUIRED, 'Step up needed', 403);
      expect(isStepUpRequired(stepUpErr)).toBe(true);

      const twoFaErr = new ApiError(ERROR_CODES.TWO_FACTOR_REQUIRED, '2FA needed', 403);
      expect(isTwoFactorRequired(twoFaErr)).toBe(true);
    });
  });

  describe('Runtime Formats', () => {
    function FormatTester() {
      const formattedMoney = useCurrency(50000000n);
      const formattedDate = useDateFormat('2026-10-04');
      return (
        <div>
          <span data-testid="money">{formattedMoney}</span>
          <span data-testid="date">{formattedDate}</span>
        </div>
      );
    }

    it('formats currency in BDT lakh/crore and dates in Asia/Dhaka', () => {
      render(
        <PlatformProvider adapters={defaultPlatformAdapters}>
          <FormatTester />
        </PlatformProvider>,
      );

      expect(screen.getByTestId('money').textContent).toBe('৳5,00,000.00');
      expect(screen.getByTestId('date').textContent).toBe('04 Oct 2026');
    });
  });
});
