import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PlatformProvider,
  AuthProvider,
  defaultPlatformAdapters,
  InMemorySecureStorage,
} from '@exzaestate/app-core';
import { ToastProvider } from '@exzaestate/ui';
import { PERMISSIONS } from '@exzaestate/shared';
import * as apiClient from '@exzaestate/api-client';
import type { PropertyItem } from './hooks/usePropertyList.js';

export const mockProperties: PropertyItem[] = [
  {
    id: 'prop-uuid-1',
    companyId: 'company-1',
    projectId: '0192a000-0000-7000-8000-000000000001',
    blockId: 'block-1',
    floorId: 'floor-1',
    code: 'FLAT-3A',
    title: '3BHK South Facing Luxury Flat',
    type: 'FLAT',
    status: 'Available',
    areaSqft: '1450',
    facing: 'SOUTH',
    basePricePaisa: '1200000000',
    premiumPaisa: '50000000',
    discountLimitPct: '5.00',
    netPricePaisa: '1250000000',
    ownerType: 'COMPANY',
    holdExpiresAt: null,
    blockReason: null,
    description: 'Corner luxury unit overlooking central garden',
    metadata: null,
    block: { id: 'block-1', code: 'BLK-A', name: 'Block A' },
    floor: { id: 'floor-1', code: 'FLR-3', name: '3rd Floor', floorNumber: 3 },
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'prop-uuid-2',
    companyId: 'company-1',
    projectId: '0192a000-0000-7000-8000-000000000001',
    blockId: 'block-1',
    floorId: null,
    code: 'PLOT-12',
    title: '5 Katha Prime Corner Plot',
    type: 'PLOT',
    status: 'Booked',
    areaSqft: '3600',
    facing: 'EAST',
    basePricePaisa: '2500000000',
    premiumPaisa: '0',
    discountLimitPct: '3.00',
    netPricePaisa: '2500000000',
    ownerType: 'LANDOWNER',
    holdExpiresAt: null,
    blockReason: null,
    description: 'Direct 40ft road frontage',
    metadata: null,
    block: { id: 'block-1', code: 'BLK-A', name: 'Block A' },
    floor: null,
    createdAt: '2026-10-02T10:00:00Z',
    updatedAt: '2026-10-02T10:00:00Z',
  },
  {
    id: 'prop-uuid-3',
    companyId: 'company-1',
    projectId: '0192a000-0000-7000-8000-000000000001',
    blockId: null,
    floorId: null,
    code: 'COMM-SHOP-1',
    title: 'Ground Floor Commercial Shop',
    type: 'SHOP',
    status: 'Sold',
    areaSqft: '450',
    facing: 'NORTH',
    basePricePaisa: '800000000',
    premiumPaisa: '0',
    discountLimitPct: '0',
    netPricePaisa: '800000000',
    ownerType: 'COMPANY',
    holdExpiresAt: null,
    blockReason: null,
    description: null,
    metadata: null,
    block: null,
    floor: null,
    createdAt: '2026-10-03T10:00:00Z',
    updatedAt: '2026-10-03T10:00:00Z',
  },
];

export const mockStatusHistory = [
  {
    id: 'hist-1',
    propertyId: 'prop-uuid-1',
    fromStatus: null,
    toStatus: 'Available',
    reason: 'Initial unit inventory creation',
    changedById: 'admin-user-uuid',
    createdAt: '2026-10-01T10:00:00Z',
  },
];

interface AdapterRequestConfig {
  url?: string;
  method?: string;
  data?: unknown;
}

function handleAuthRefresh(config: AdapterRequestConfig) {
  return {
    data: { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  };
}

function handleAuthMe(config: AdapterRequestConfig) {
  return {
    data: {
      success: true,
      data: {
        id: 'admin-user-uuid',
        email: 'admin@exzaestate.com',
        fullName: 'Tanvir Hossain',
        companyId: 'company-1',
        permissions: [
          PERMISSIONS.PROPERTY_VIEW,
          PERMISSIONS.PROPERTY_CREATE,
          PERMISSIONS.PROPERTY_EDIT,
          PERMISSIONS.PROPERTY_DELETE,
          PERMISSIONS.PROPERTY_OVERRIDE_STATUS,
        ],
        scopes: {
          [PERMISSIONS.PROPERTY_VIEW]: 'ALL',
          [PERMISSIONS.PROPERTY_CREATE]: 'ALL',
          [PERMISSIONS.PROPERTY_EDIT]: 'ALL',
          [PERMISSIONS.PROPERTY_DELETE]: 'ALL',
          [PERMISSIONS.PROPERTY_OVERRIDE_STATUS]: 'ALL',
        },
        branchIds: [],
      },
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  };
}

function handlePropertyMutations(url: string, method: string, config: AdapterRequestConfig) {
  if (url.includes('/status/override')) {
    return {
      data: { success: true, data: { ...mockProperties[0], status: 'Blocked' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }
  if (url.includes('/api/v1/properties') && method === 'POST') {
    const rawData = config.data;
    const body = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData ?? {});
    return {
      data: {
        success: true,
        data: {
          id: 'prop-new-1',
          ...body,
          netPricePaisa: '1500000000',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      status: 201,
      statusText: 'Created',
      headers: {},
      config,
    };
  }
  return null;
}

function handlePropertyQueries(url: string, method: string, config: AdapterRequestConfig) {
  if (url.includes('/history')) {
    return {
      data: { success: true, data: mockStatusHistory },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }
  if (url.includes('/api/v1/properties/prop-uuid-1') && method === 'GET') {
    return {
      data: { success: true, data: mockProperties[0] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }
  if (url.includes('/api/v1/properties') && method === 'GET') {
    return {
      data: {
        success: true,
        data: {
          items: mockProperties,
          total: mockProperties.length,
          page: 1,
          limit: 25,
          totalPages: 1,
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }
  return null;
}

export function setupTestAdapter(): void {
  type AxiosAdapterFn = (config: AdapterRequestConfig) => Promise<unknown>;
  const adapterFn: AxiosAdapterFn = async (config) => {
    const url = config.url ?? '';
    const method = (config.method ?? 'get').toUpperCase();

    if (url.includes('/api/v1/auth/refresh')) return handleAuthRefresh(config);
    if (url.includes('/api/v1/auth/me')) return handleAuthMe(config);

    const mutationRes = handlePropertyMutations(url, method, config);
    if (mutationRes) return mutationRes;

    const queryRes = handlePropertyQueries(url, method, config);
    if (queryRes) return queryRes;

    return {
      data: { success: true, data: {} },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  Object.assign(apiClient.apiClient.defaults, { adapter: adapterFn });
}

export function renderWithProviders(
  ui: ReactElement,
  options: {
    queryClient: QueryClient;
    mockSecureStorage: InMemorySecureStorage;
    initialRoute?: string;
  },
): RenderResult {
  const { queryClient, mockSecureStorage, initialRoute = '/properties' } = options;
  const adapters = {
    ...defaultPlatformAdapters,
    secureStorage: mockSecureStorage,
  };

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <PlatformProvider adapters={adapters}>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <Routes>
                <Route path="/properties" element={ui} />
                <Route path="/properties/:id" element={ui} />
                <Route path="/crm/leads" element={ui} />
                <Route path="/crm/follow-ups" element={ui} />
                <Route path="/customers" element={ui} />
                <Route path="/customers/:id" element={ui} />
                <Route path="*" element={ui} />
              </Routes>
            </ToastProvider>
          </QueryClientProvider>
        </AuthProvider>
      </PlatformProvider>
    </MemoryRouter>,
  );
}
