import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { InMemorySecureStorage } from '@exzaestate/app-core';
import * as apiClient from '@exzaestate/api-client';

import { LeadListPage } from './pages/LeadListPage.js';
import { FollowUpCalendarPage } from './pages/FollowUpCalendarPage.js';
import { renderWithProviders } from '../property/test-utils.js';

const mockLeads = [
  {
    id: 'lead-1',
    fullName: 'Kamal Hossain',
    phone: '+8801711111111',
    email: 'kamal@example.com',
    source: 'FACEBOOK',
    status: 'NEW',
    preferredType: '3BHK',
    budgetMinPaisa: '500000000',
    budgetMaxPaisa: '1500000000',
    assignedToId: 'user-1',
    assignedTo: { id: 'user-1', fullName: 'Shakib Sales', email: 'shakib@exza.com' },
    notes: 'Looking for a flat in Banani',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'lead-2',
    fullName: 'Farhana Ahmed',
    phone: '+8801822222222',
    email: 'farhana@example.com',
    source: 'WALK_IN',
    status: 'NEGOTIATION',
    preferredType: 'Plot',
    budgetMinPaisa: '1000000000',
    budgetMaxPaisa: '2500000000',
    assignedToId: 'user-1',
    assignedTo: { id: 'user-1', fullName: 'Shakib Sales', email: 'shakib@exza.com' },
    notes: 'Negotiating plot 12',
    createdAt: '2026-03-02T10:00:00.000Z',
    updatedAt: '2026-03-02T10:00:00.000Z',
  },
];

const mockFollowUps = [
  {
    id: 'fu-1',
    leadId: 'lead-1',
    type: 'CALL',
    scheduledAt: '2026-01-01T10:00:00.000Z', // Past date -> Overdue
    notes: 'Call prospect for project brochure feedback',
    status: 'PENDING',
    lead: { id: 'lead-1', fullName: 'Kamal Hossain', phone: '+8801711111111' },
    createdAt: '2026-01-01T09:00:00.000Z',
  },
];

interface AdapterConfig {
  url?: string;
  method?: string;
  data?: unknown;
}

function setupCrmAdapter() {
  const adapterFn = async (config: AdapterConfig) => {
    const url = config.url ?? '';
    const method = (config.method ?? 'get').toUpperCase();

    if (url.includes('/api/v1/auth/refresh')) {
      return {
        data: {
          success: true,
          data: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600,
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
            id: 'user-1',
            email: 'admin@exzaestate.com',
            fullName: 'System Administrator',
            companyId: 'company-1',
            roles: ['ADMIN'],
            permissions: [
              'lead:view',
              'lead:create',
              'lead:edit',
              'follow-up:view',
              'follow-up:create',
              'follow-up:edit',
              'customer:view',
              'customer:create',
              'customer:edit',
            ],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    if (url.includes('/api/v1/crm/leads') && method === 'GET') {
      return {
        data: {
          success: true,
          data: { items: mockLeads, total: mockLeads.length, totalPages: 1 },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    if (url.includes('/api/v1/crm/follow-ups') && method === 'GET') {
      return {
        data: {
          success: true,
          data: { items: mockFollowUps, total: mockFollowUps.length },
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

  Object.assign(apiClient.apiClient.defaults, { adapter: adapterFn });
}

describe('CRM Module: Leads & Follow-ups (B2)', () => {
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
    setupCrmAdapter();
  });

  it('renders lead list with 3-tier header, KPIs, and table view', async () => {
    await act(async () => {
      renderWithProviders(<LeadListPage />, {
        queryClient,
        mockSecureStorage,
        initialRoute: '/crm/leads',
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Lead Pipeline/i })).toBeDefined();
      expect(screen.getByText('2 Prospects')).toBeDefined();
      expect(screen.getByText('Kamal Hossain')).toBeDefined();
      expect(screen.getByText('Farhana Ahmed')).toBeDefined();
    });

    expect(screen.getByText('Total Leads')).toBeDefined();
    expect(screen.getByText('New Inquiries')).toBeDefined();
  });

  it('toggles between Table view and Kanban pipeline board', async () => {
    await act(async () => {
      renderWithProviders(<LeadListPage />, {
        queryClient,
        mockSecureStorage,
        initialRoute: '/crm/leads',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Kamal Hossain')).toBeDefined();
    });

    const kanbanBtn = screen.getByRole('button', { name: /Kanban Board View/i });
    await act(async () => {
      fireEvent.click(kanbanBtn);
    });

    expect(screen.getByText('New Leads')).toBeDefined();
    expect(screen.getByText('Won / Customer')).toBeDefined();
  });

  it('opens LeadDrawer on prospect row click', async () => {
    await act(async () => {
      renderWithProviders(<LeadListPage />, {
        queryClient,
        mockSecureStorage,
        initialRoute: '/crm/leads',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Kamal Hossain')).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Kamal Hossain'));
    });

    await waitFor(() => {
      expect(screen.getByText('Pipeline Stage')).toBeDefined();
      expect(screen.getByText('Investment Budget')).toBeDefined();
    });
  });

  it('renders follow-up schedule with overdue chips', async () => {
    await act(async () => {
      renderWithProviders(<FollowUpCalendarPage />, {
        queryClient,
        mockSecureStorage,
        initialRoute: '/crm/follow-ups',
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Follow-up Schedule/i })).toBeDefined();
      expect(screen.getByText(/1 Overdue/i)).toBeDefined();
      expect(screen.getByText('Call prospect for project brochure feedback')).toBeDefined();
    });
  });
});
