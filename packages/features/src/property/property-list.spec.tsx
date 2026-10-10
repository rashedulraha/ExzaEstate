import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { InMemorySecureStorage } from '@exzaestate/app-core';
import * as apiClient from '@exzaestate/api-client';

import { PropertyListPage } from './pages/PropertyListPage.js';
import { setupTestAdapter, renderWithProviders } from './test-utils.js';

describe('PropertyListPage — 3-Tier Standard & Acceptance Checks', () => {
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

  it('renders Tier 1 Header with title, context count badge and action buttons', async () => {
    await act(async () => {
      renderWithProviders(<PropertyListPage />, { queryClient, mockSecureStorage });
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Property Inventory/i })).toBeDefined();
      expect(screen.getByText(/3 Units/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Table View/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Cadastral Plan View/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Add Property/i })).toBeDefined();
    });
  });

  it('renders Tier 2 KPI Summary cards with computed counts', async () => {
    await act(async () => {
      renderWithProviders(<PropertyListPage />, { queryClient, mockSecureStorage });
    });

    await waitFor(() => {
      expect(screen.getByText('Total Units')).toBeDefined();
      expect(screen.getByText('Full Portfolio Volume')).toBeDefined();
      expect(screen.getByText('Ready for Quotation & Sale')).toBeDefined();
      expect(screen.getByText('Reserved & Booked')).toBeDefined();
      expect(screen.getByText('In Sales Pipeline')).toBeDefined();
      expect(screen.getByText('Sold Units')).toBeDefined();
      expect(screen.getByText('Deeds & Handover Active')).toBeDefined();
    });
  });

  it('renders PropertyDataTable with BDT formatting and Bengali area calculations', async () => {
    await act(async () => {
      renderWithProviders(<PropertyListPage />, { queryClient, mockSecureStorage });
    });

    await waitFor(() => {
      expect(screen.getByText('FLAT-3A')).toBeDefined();
      expect(screen.getByText('PLOT-12')).toBeDefined();
      expect(screen.getByText('COMM-SHOP-1')).toBeDefined();

      expect(screen.getByText('BDT 1,25,00,000.00')).toBeDefined();
      expect(screen.getByText('BDT 2,50,00,000.00')).toBeDefined();
      expect(screen.getByText('BDT 80,00,000.00')).toBeDefined();

      expect(screen.getByText('1,450.00 sq ft')).toBeDefined();
      expect(screen.getByText('(2.01 katha)')).toBeDefined();
    });
  });

  it('toggles cleanly between Table View and Cadastral Plan View', async () => {
    await act(async () => {
      renderWithProviders(<PropertyListPage />, { queryClient, mockSecureStorage });
    });

    await waitFor(() => {
      expect(screen.getByText('Unit Code')).toBeDefined();
    });

    const planViewBtn = screen.getByRole('button', { name: /Cadastral Plan View/i });
    await act(async () => {
      fireEvent.click(planViewBtn);
    });

    expect(screen.getByLabelText(/Master Plan View for Property Inventory/i)).toBeDefined();
    expect(screen.getByText(/Sold \(Solid\)/i)).toBeDefined();
    expect(screen.getByText(/Reserved \(Dotted\)/i)).toBeDefined();

    const tableViewBtn = screen.getByRole('button', { name: /Table View/i });
    await act(async () => {
      fireEvent.click(tableViewBtn);
    });

    expect(screen.getByText('Unit Code')).toBeDefined();
  });

  it('opens PropertyDrawer on row click and renders pricing breakdown and history', async () => {
    await act(async () => {
      renderWithProviders(<PropertyListPage />, { queryClient, mockSecureStorage });
    });

    let flatRow: HTMLElement | null = null;
    await waitFor(() => {
      flatRow = screen.getByText('FLAT-3A');
      expect(flatRow).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(flatRow!);
    });

    await waitFor(() => {
      expect(screen.getByText('Pricing Breakdown')).toBeDefined();
      expect(screen.getByText('Specifications')).toBeDefined();
      expect(screen.getByText('Status Audit History')).toBeDefined();
      expect(screen.getByText('BDT 1,20,00,000.00')).toBeDefined();
      expect(screen.getByText('BDT 5,00,000.00')).toBeDefined();
    });
  });

  it('renders sticky filter toolbar with all canonical quick filter chips and handles filter selection', async () => {
    await act(async () => {
      renderWithProviders(<PropertyListPage />, { queryClient, mockSecureStorage });
    });

    await waitFor(() => {
      expect(screen.getByText('Quick Filter:')).toBeDefined();
    });

    // Check all chips are rendered
    expect(screen.getByRole('button', { name: 'All Units' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Available' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reserved' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Booked' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sold' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Hold' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Blocked' })).toBeDefined();

    // Clicking Available pill filters without error
    const availablePill = screen.getByRole('button', { name: 'Available' });
    await act(async () => {
      fireEvent.click(availablePill);
    });

    expect(availablePill.className).toContain('bg-primary');
  });

  it('renders canonical dashed EmptyState and hides filter toolbar when no properties exist', async () => {
    setupTestAdapter({ properties: [] });

    await act(async () => {
      renderWithProviders(<PropertyListPage />, { queryClient, mockSecureStorage });
    });

    await waitFor(() => {
      expect(screen.getByText('No properties found in project')).toBeDefined();
      expect(screen.getByText(/Your project has no property units yet/i)).toBeDefined();
      expect(screen.getAllByRole('button', { name: /Add Property/i })).toHaveLength(2);
    });

    // Quick filter toolbar should NOT be visible when there are 0 units
    expect(screen.queryByText('Quick Filter:')).toBeNull();
    expect(screen.queryByPlaceholderText('Search unit code or title...')).toBeNull();
  });
});
