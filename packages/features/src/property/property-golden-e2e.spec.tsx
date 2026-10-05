import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { InMemorySecureStorage } from '@exzaestate/app-core';
import * as apiClient from '@exzaestate/api-client';

import { PropertyListPage } from './pages/PropertyListPage.js';
import { setupTestAdapter, renderWithProviders } from './test-utils.js';

describe('Golden Flow E2E: Property Inventory @golden', () => {
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
    await mockSecureStorage.setItem('refresh_token', 'valid-mock-refresh-token');
    apiClient.resetClientState();
    vi.clearAllMocks();
    setupTestAdapter();
  });

  it('executes full golden flow: list -> plan view -> drawer inspection -> status override', async () => {
    // 1. Initial Render: PropertyListPage
    await act(async () => {
      renderWithProviders(<PropertyListPage />, { queryClient, mockSecureStorage });
    });

    // Verify Tier 1 Header & Tier 2 KPIs
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Property Inventory/i })).toBeDefined();
      expect(screen.getByText('Total Units')).toBeDefined();
    });

    // 2. Toggle to Cadastral Plan View
    const planViewBtn = screen.getByRole('button', { name: /Cadastral Plan View/i });
    await act(async () => {
      fireEvent.click(planViewBtn);
    });

    expect(screen.getByLabelText(/Master Plan View for Property Inventory/i)).toBeDefined();

    // Toggle back to Table View
    const tableViewBtn = screen.getByRole('button', { name: /Table View/i });
    await act(async () => {
      fireEvent.click(tableViewBtn);
    });

    // 3. Inspect unit via Slide-over Drawer
    let flatRow: HTMLElement | null = null;
    await waitFor(() => {
      flatRow = screen.getByText('FLAT-3A');
      expect(flatRow).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(flatRow!);
    });

    // Verify Drawer contents
    await waitFor(() => {
      expect(screen.getByText('Pricing Breakdown')).toBeDefined();
      expect(screen.getByText('Specifications')).toBeDefined();
      expect(screen.getByText('Status Audit History')).toBeDefined();
    });

    // 4. Open Status Override Modal
    const overrideActionBtns = screen.getAllByRole('button', { name: /Override Status/i });
    expect(overrideActionBtns.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.click(overrideActionBtns[0]!);
    });

    await waitFor(() => {
      expect(screen.getByText(/Elevated Administrative Action/i)).toBeDefined();
    });

    // Fill mandatory audit reason
    const reasonInput = screen.getByLabelText(/Mandatory Business Justification/i);
    await act(async () => {
      fireEvent.change(reasonInput, {
        target: { value: 'Management dispute resolution override' },
      });
    });

    // Submit override in modal dialog
    const submitBtn = screen.getByRole('button', { name: /^Override Status$/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Modal closes on success
    await waitFor(() => {
      expect(screen.queryByText(/Elevated Administrative Action/i)).toBeNull();
    });
  });
});
