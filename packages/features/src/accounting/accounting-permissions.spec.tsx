import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { PERMISSIONS } from '@exzaestate/shared';
import * as appCore from '@exzaestate/app-core';
import { GeneralLedgerView } from './components/ledger/GeneralLedgerView.js';
import { accountingRoutes } from './accounting.routes.js';
import { testLedgerEntries, testAccounts } from './accounting.test-fixtures.js';

const mockUsePermission = vi.fn();

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: (perm: string, scope?: unknown) => mockUsePermission(perm, scope),
    PermissionGate: ({
      permission,
      scope,
      fallback = null,
      children,
    }: {
      permission: string;
      scope?: unknown;
      fallback?: React.ReactNode;
      children: React.ReactNode;
    }) => {
      const { hasPermission } = mockUsePermission(permission, scope);
      if (!hasPermission) {
        return fallback ? <>{fallback}</> : null;
      }
      return <>{children}</>;
    },
  };
});

describe('Accounting Module (B5) - CRITICAL ACCEPTANCE: Executive Role & Route Gating', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });
  });

  it('Executive role (lacking ledger:view) is denied access to /accounting/ledger and sees NoPermissionState', () => {
    mockUsePermission.mockImplementation((perm: string) => {
      return {
        hasPermission: perm !== PERMISSIONS.LEDGER_VIEW,
        scope: 'OWN',
      };
    });

    render(
      <MemoryRouter initialEntries={['/accounting/ledger']}>
        <Routes>
          {accountingRoutes.map((route, idx) => (
            <Route key={idx} path={route.path} element={route.element} />
          ))}
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Access Restricted')).toBeDefined();
    expect(screen.getByText(/ledger:view/)).toBeDefined();
    expect(screen.queryByTestId('general-ledger-view')).toBeNull();
  });

  it('Executive role is denied access to alias routes /accounting/ledgers and /ledgers', () => {
    mockUsePermission.mockImplementation((perm: string) => {
      return {
        hasPermission: perm !== PERMISSIONS.LEDGER_VIEW,
        scope: 'OWN',
      };
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/ledgers']}>
        <Routes>
          {accountingRoutes.map((route, idx) => (
            <Route key={idx} path={route.path} element={route.element} />
          ))}
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Access Restricted')).toBeDefined();
    expect(screen.getByText(/ledger:view/)).toBeDefined();
    unmount();

    render(
      <MemoryRouter initialEntries={['/accounting/ledgers']}>
        <Routes>
          {accountingRoutes.map((route, idx) => (
            <Route key={idx} path={route.path} element={route.element} />
          ))}
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Access Restricted')).toBeDefined();
    expect(screen.getByText(/ledger:view/)).toBeDefined();
  });

  it('GeneralLedgerView component directly renders NoPermissionState when user lacks permission', () => {
    mockUsePermission.mockImplementation((perm: string) => {
      return {
        hasPermission: perm !== PERMISSIONS.LEDGER_VIEW,
        scope: 'OWN',
      };
    });

    render(
      <GeneralLedgerView
        lines={testLedgerEntries}
        totals={{
          openingBalancePaisa: '0',
          totalDebitsPaisa: '50000000',
          totalCreditsPaisa: '500000',
          closingBalancePaisa: '49500000',
        }}
        filters={{}}
        onFilterChange={vi.fn()}
        accounts={testAccounts}
      />,
    );

    expect(screen.getByText('Access Restricted')).toBeDefined();
    expect(screen.getByText(/ledger:view/)).toBeDefined();
    expect(screen.queryByTestId('general-ledger-view')).toBeNull();
  });
});
