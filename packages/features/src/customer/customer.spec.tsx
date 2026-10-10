import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { InMemorySecureStorage } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import * as apiClient from '@exzaestate/api-client';

import { CustomerListPage } from './pages/CustomerListPage.js';
import { CustomerDetailPage } from './pages/CustomerDetailPage.js';
import { renderWithProviders } from '../property/test-utils.js';

const mockCustomer = {
  id: 'cust-1',
  customerCode: 'CUST-2026-001',
  fullName: 'Mohammad Anisur Rahman',
  phone: '+8801812345678',
  email: 'anis@example.com',
  nid: '19851234567890123',
  maskedNid: '•••• •••• ••0123',
  kycStatus: 'VERIFIED',
  kycVerifiedAt: '2026-02-15T12:00:00.000Z',
  kycRemarks: 'EC database cross-checked',
  fatherName: 'Late Abdul Karim',
  motherName: 'Razia Begum',
  spouseName: 'Farhana Sultana',
  dateOfBirth: '1985-06-12',
  occupation: 'Civil Engineer',
  tin: '123456789012',
  emergencyContact: '+8801700000000',
  address: 'House 42, Road 11, Sector 4, Uttara, Dhaka',
  coBuyers: [
    {
      id: 'cb-1',
      fullName: 'Farhana Sultana',
      phone: '+8801712000000',
      nid: '19901234567890000',
      maskedNid: '•••• •••• ••0000',
      relation: 'Spouse',
      sharePercentage: 50,
    },
  ],
  nominees: [
    {
      id: 'nom-1',
      fullName: 'Tanzim Rahman',
      phone: '+8801912000000',
      nid: '20101234567890000',
      maskedNid: '•••• •••• ••0000',
      relation: 'Son',
      sharePercentage: 100,
    },
  ],
  documents: [],
  createdAt: '2026-02-01T10:00:00.000Z',
  updatedAt: '2026-02-15T12:00:00.000Z',
};

interface AdapterConfig {
  url?: string;
  method?: string;
  data?: unknown;
}

function getAuthMeResponse(hasPii: boolean) {
  const permissions: string[] = [
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.CUSTOMER_CREATE,
    PERMISSIONS.CUSTOMER_EDIT,
    PERMISSIONS.CUSTOMER_VERIFY_KYC,
  ];
  if (hasPii) permissions.push(PERMISSIONS.CUSTOMER_VIEW_PII);
  return {
    id: 'user-1',
    email: 'officer@exzaestate.com',
    fullName: 'Sales Officer',
    companyId: 'company-1',
    roles: ['EXECUTIVE'],
    permissions,
  };
}

function getCustomerRouteData(url: string, hasPii: boolean): unknown {
  if (url.includes('/api/v1/auth/refresh')) {
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
    };
  }
  if (url.includes('/api/v1/auth/me')) {
    return getAuthMeResponse(hasPii);
  }
  if (url.includes('/api/v1/crm/customers/cust-1/timeline')) {
    return [
      {
        id: 'tl-1',
        eventType: 'KYC_VERIFIED',
        description: 'Customer KYC verified by Admin',
        createdAt: '2026-02-15T12:00:00.000Z',
        actorName: 'System Administrator',
      },
    ];
  }
  if (url.includes('/api/v1/crm/customers/cust-1')) {
    return mockCustomer;
  }
  if (url.includes('/api/v1/crm/customers')) {
    return { items: [mockCustomer], total: 1, totalPages: 1 };
  }
  return {};
}

function setupCustomerAdapter(hasPiiPermission = false) {
  const adapterFn = async (config: AdapterConfig) => {
    const url = config.url ?? '';
    const data = getCustomerRouteData(url, hasPiiPermission);
    return { data: { success: true, data }, status: 200, statusText: 'OK', headers: {}, config };
  };
  Object.assign(apiClient.apiClient.defaults, { adapter: adapterFn });
}

describe('Customer 360 Module (B2)', () => {
  let queryClient: QueryClient;
  let mockSecureStorage: InMemorySecureStorage;

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
        mutations: { retry: false },
      },
    });
    mockSecureStorage = new InMemorySecureStorage();
    await mockSecureStorage.setItem('refresh_token', 'mock-token');
  });

  it('renders customer directory list with 3-tier header and KPIs', async () => {
    setupCustomerAdapter(false);

    await act(async () => {
      renderWithProviders(<CustomerListPage />, {
        queryClient,
        mockSecureStorage,
        initialRoute: '/customers',
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Customer Directory/i })).toBeDefined();
      expect(screen.getByText('1 Profiles')).toBeDefined();
      expect(screen.getByText('Mohammad Anisur Rahman')).toBeDefined();
      expect(screen.getByText('CUST-2026-001')).toBeDefined();
    });

    expect(screen.getByText('Total Customers')).toBeDefined();
    expect(screen.getByText('KYC Verified')).toBeDefined();
  });

  it('ACCEPTANCE: Masked NID is displayed and unmasked NID is NEVER in DOM without PII permission', async () => {
    // User does NOT have 'customer:view-pii' permission
    setupCustomerAdapter(false);

    await act(async () => {
      renderWithProviders(<CustomerDetailPage />, {
        queryClient,
        mockSecureStorage,
        initialRoute: '/customers/cust-1',
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Mohammad Anisur Rahman' }),
      ).toBeDefined();
      expect(screen.getByText(/Masked PII/i)).toBeDefined();
    });

    // Masked value MUST be in the DOM
    expect(screen.getByText(/•••• •••• ••0123/i)).toBeDefined();

    // CRITICAL ACCEPTANCE INVARIANT: The unmasked NID must NOT exist anywhere in the DOM!
    expect(screen.queryByText('19851234567890123')).toBeNull();
  });

  it('renders unmasked NID in DOM when user holds customer:view-pii permission', async () => {
    // User HAS 'customer:view-pii' permission
    setupCustomerAdapter(true);

    await act(async () => {
      renderWithProviders(<CustomerDetailPage />, {
        queryClient,
        mockSecureStorage,
        initialRoute: '/customers/cust-1',
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Mohammad Anisur Rahman' }),
      ).toBeDefined();
    });

    // Unmasked NID should be present in the DOM
    await waitFor(() => {
      expect(screen.getByText('19851234567890123')).toBeDefined();
    });
  });

  it('navigates across tabs: Joint Buyers and Nominees', async () => {
    setupCustomerAdapter(true);

    await act(async () => {
      renderWithProviders(<CustomerDetailPage />, {
        queryClient,
        mockSecureStorage,
        initialRoute: '/customers/cust-1',
      });
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Mohammad Anisur Rahman' }),
      ).toBeDefined();
    });

    // Click Joint Buyers tab
    const jointBuyersTab = screen.getByRole('button', { name: /Joint Buyers/i });
    await act(async () => {
      fireEvent.click(jointBuyersTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Farhana Sultana')).toBeDefined();
      expect(screen.getByText(/50% Share/i)).toBeDefined();
    });

    // Click Nominees tab
    const nomineesTab = screen.getByRole('button', { name: /Nominees/i });
    await act(async () => {
      fireEvent.click(nomineesTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Tanzim Rahman')).toBeDefined();
      expect(screen.getByText(/100% Share/i)).toBeDefined();
    });
  });

  it('renders customer directory empty state with p-6 container and wide verification status filter dropdown', async () => {
    const emptyAdapterFn = async (config: AdapterConfig) => {
      const url = config.url ?? '';
      if (url.includes('/api/v1/auth/me')) {
        return {
          data: { success: true, data: getAuthMeResponse(false) },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      if (url.includes('/api/v1/crm/customers')) {
        return {
          data: { success: true, data: { items: [], total: 0, totalPages: 0 } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      return {
        data: { success: true, data: {} },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
    Object.assign(apiClient.apiClient.defaults, { adapter: emptyAdapterFn });

    const { container } = renderWithProviders(<CustomerListPage />, {
      queryClient,
      mockSecureStorage,
      initialRoute: '/customers',
    });

    await waitFor(() => {
      expect(screen.getByText('No Customers Registered')).toBeDefined();
      expect(screen.getByText('All Verification Statuses')).toBeDefined();
    });

    // Verify empty state is wrapped in p-6 breathing room matching benchmark
    const p6Wrapper = container.querySelector('.p-6');
    expect(p6Wrapper).not.toBeNull();
    expect(p6Wrapper?.textContent).toContain('No Customers Registered');

    // Verify filter dropdown container has w-56 sm:w-60
    const filterContainer = container.querySelector('.w-56');
    expect(filterContainer).not.toBeNull();
  });
});
