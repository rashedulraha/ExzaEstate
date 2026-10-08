import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PlatformProvider,
  AuthProvider,
  defaultPlatformAdapters,
  InMemorySecureStorage,
  type PlatformAdapters,
  type SaveDialogOptions,
  type OpenDialogOptions,
} from '@exzaestate/app-core';
import { ToastProvider, ThemeProvider } from '@exzaestate/ui';
import { PERMISSIONS } from '@exzaestate/shared';
import { apiClient } from '@exzaestate/api-client';
import {
  GOLDEN_LEAD,
  GOLDEN_CUSTOMER,
  GOLDEN_PROPERTY,
  GOLDEN_QUOTATION,
  GOLDEN_BOOKING,
  GOLDEN_PAYMENTS,
  GOLDEN_STATEMENT,
  GOLDEN_RECONCILIATION,
  generateInstallmentSchedule,
} from './golden-flow-data.js';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export interface AdapterRequestConfig {
  url?: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
}

export class GoldenFlowState {
  lead = { ...GOLDEN_LEAD };
  customer = { ...GOLDEN_CUSTOMER };
  property = { ...GOLDEN_PROPERTY };
  quotation = { ...GOLDEN_QUOTATION };
  booking = { ...GOLDEN_BOOKING };
  payments = [...GOLDEN_PAYMENTS];
  schedule = generateInstallmentSchedule();
  statement = { ...GOLDEN_STATEMENT };
  reconciliation = { ...GOLDEN_RECONCILIATION };

  reset() {
    this.lead = { ...GOLDEN_LEAD };
    this.customer = { ...GOLDEN_CUSTOMER };
    this.property = { ...GOLDEN_PROPERTY };
    this.quotation = { ...GOLDEN_QUOTATION };
    this.booking = { ...GOLDEN_BOOKING };
    this.payments = [...GOLDEN_PAYMENTS];
    this.schedule = generateInstallmentSchedule();
    this.statement = { ...GOLDEN_STATEMENT };
    this.reconciliation = { ...GOLDEN_RECONCILIATION };
  }
}

export const flowState = new GoldenFlowState();

export function setupGoldenFlowApiAdapter(): void {
  type AxiosAdapterFn = (config: AdapterRequestConfig) => Promise<unknown>;
  const adapterFn: AxiosAdapterFn = async (config) => {
    const url = config.url ?? '';
    const method = (config.method ?? 'get').toUpperCase();

    // 1. Auth routes
    if (url.includes('/api/v1/auth/refresh')) {
      return {
        data: {
          success: true,
          data: {
            accessToken: 'valid-test-access-token',
            refreshToken: 'valid-test-refresh-token',
            user: {
              id: 'user-0000-0000-0000-000000000001',
              email: 'admin@exzaestate.com',
              fullName: 'MD / Admin Operator',
              roles: ['MANAGING_DIRECTOR', 'ACCOUNTANT'],
            },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    if (url.includes('/api/v1/auth/me')) {
      return {
        data: {
          success: true,
          data: {
            id: 'user-0000-0000-0000-000000000001',
            email: 'admin@exzaestate.com',
            fullName: 'MD / Admin Operator',
            companyId: '00000000-0000-0000-0000-000000000001',
            companyName: 'Exza Living Ltd.',
            roles: ['MANAGING_DIRECTOR', 'ACCOUNTANT'],
            permissions: Object.values(PERMISSIONS),
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 2. CRM Leads
    if (url.includes('/api/v1/crm/leads') && method === 'GET') {
      return {
        data: {
          success: true,
          data: {
            items: [flowState.lead],
            total: 1,
            page: 1,
            limit: 25,
            totalPages: 1,
            kpis: {
              totalLeads: 1,
              newLeads: 0,
              inProgressLeads: 1,
              convertedLeads: 0,
            },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    if (url.includes('/api/v1/crm/leads') && method === 'POST') {
      const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data ?? {});
      flowState.lead = { ...flowState.lead, ...body, status: 'NEW' };
      return {
        data: { success: true, data: flowState.lead },
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      };
    }

    // 3. Customers
    if (url.includes('/api/v1/customers') && method === 'GET') {
      return {
        data: {
          success: true,
          data: {
            items: [flowState.customer],
            total: 1,
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

    // 4. Properties
    if (url.includes('/api/v1/properties') && method === 'GET') {
      return {
        data: {
          success: true,
          data: {
            items: [flowState.property],
            total: 1,
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

    // 5. Quotations: useQuotationList parses Array in rawData or rawData.data
    if (url.includes('/api/v1/sales/quotations') && method === 'GET') {
      return {
        data: {
          success: true,
          data: [flowState.quotation],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    if (url.includes('/api/v1/sales/quotations') && method === 'POST') {
      return {
        data: { success: true, data: flowState.quotation },
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      };
    }

    // 6. Bookings: useBookingList parses Array in rawData or rawData.data
    if (url.includes('/api/v1/sales/bookings') && method === 'GET') {
      return {
        data: {
          success: true,
          data: [flowState.booking],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    if (url.includes('/api/v1/sales/bookings') && method === 'POST') {
      return {
        data: { success: true, data: flowState.booking },
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      };
    }

    // 7. Payments & Receipts: usePaymentList parses Array in rawData or rawData.data
    if (url.includes('/api/v1/collection/payments') && method === 'GET') {
      return {
        data: {
          success: true,
          data: flowState.payments,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    if (url.includes('/api/v1/collection/installments') && method === 'GET') {
      return {
        data: {
          success: true,
          data: flowState.schedule,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 8. Customer Statement & Reconciliation
    if (url.includes('/api/v1/collection/statements') && url.includes('/reconciliation')) {
      return {
        data: {
          success: true,
          data: flowState.reconciliation,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    if (url.includes('/api/v1/collection/statements')) {
      return {
        data: {
          success: true,
          data: flowState.statement,
        },
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

  Object.assign(apiClient.defaults, { adapter: adapterFn });
}

export function createClientAdapters(mode: 'web' | 'desktop'): {
  adapters: PlatformAdapters;
  storage: InMemorySecureStorage;
} {
  const storage = new InMemorySecureStorage();

  if (mode === 'desktop') {
    const desktopAdapters: PlatformAdapters = {
      ...defaultPlatformAdapters,
      secureStorage: storage,
      apiConfig: {
        baseUrl: 'http://localhost:3000',
        runtimeMode: 'cloud',
        clientType: 'desktop',
        clientVersion: '0.1.0',
      },
      fileDialog: {
        async save(options?: SaveDialogOptions) {
          return `/downloads/${options?.defaultPath ?? 'document.pdf'}`;
        },
        async open(_options?: OpenDialogOptions) {
          return null;
        },
      },
    };
    return { adapters: desktopAdapters, storage };
  }

  // mode === 'web'
  const webAdapters: PlatformAdapters = {
    ...defaultPlatformAdapters,
    secureStorage: storage,
    apiConfig: {
      baseUrl: '/api/v1',
      runtimeMode: 'cloud',
      clientType: 'web',
      clientVersion: '0.1.0',
    },
    fileDialog: {
      async save(options?: SaveDialogOptions) {
        return `blob:${options?.defaultPath ?? 'document.pdf'}`;
      },
      async open(_options?: OpenDialogOptions) {
        return null;
      },
    },
  };
  return { adapters: webAdapters, storage };
}

export function renderClientWithMode(
  ui: ReactElement,
  options: {
    mode: 'web' | 'desktop';
    queryClient: QueryClient;
    initialRoute?: string;
  },
): RenderResult & { storage: InMemorySecureStorage } {
  const { mode, queryClient, initialRoute = '/' } = options;
  const { adapters, storage } = createClientAdapters(mode);

  const result = render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <PlatformProvider adapters={adapters}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <QueryClientProvider client={queryClient}>
                <Routes>
                  <Route path="/" element={ui} />
                  <Route path="/crm/leads" element={ui} />
                  <Route path="/customers" element={ui} />
                  <Route path="/sales/quotations" element={ui} />
                  <Route path="/sales/bookings" element={ui} />
                  <Route path="/collection/payments" element={ui} />
                  <Route path="/collection/installments" element={ui} />
                  <Route path="/collection/statements" element={ui} />
                  <Route path="*" element={ui} />
                </Routes>
              </QueryClientProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </PlatformProvider>
    </MemoryRouter>,
  );

  return { ...result, storage };
}
