import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { InMemorySecureStorage } from '@exzaestate/app-core';
import * as apiClient from '@exzaestate/api-client';

import { PropertyDetailPage } from './pages/PropertyDetailPage.js';
import { PropertyFormModal } from './components/PropertyFormModal.js';
import { PropertyStatusOverrideModal } from './components/PropertyStatusOverrideModal.js';
import { mockProperties, setupTestAdapter, renderWithProviders } from './test-utils.js';

describe('Property Forms & Detail Pages', () => {
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

  describe('PropertyFormModal — Financial Calculation & Validation', () => {
    it('calculates live Net Price using pure Money.add without client invariants', async () => {
      await act(async () => {
        renderWithProviders(
          <PropertyFormModal
            isOpen={true}
            onClose={vi.fn()}
            defaultProjectId="0192a000-0000-7000-8000-000000000001"
          />,
          { queryClient, mockSecureStorage },
        );
      });

      expect(screen.getByRole('heading', { name: /Add Property Unit/i })).toBeDefined();

      const baseInput = screen.getByLabelText(/Base Price \(Paisa\)/i);
      const premiumInput = screen.getByLabelText(/Premium Price \(Paisa\)/i);

      await act(async () => {
        fireEvent.change(baseInput, { target: { value: '1000000000' } });
      });

      await act(async () => {
        fireEvent.change(premiumInput, { target: { value: '250000000' } });
      });

      await waitFor(() => {
        expect(screen.getByText('BDT 1,25,00,000.00')).toBeDefined();
      });
    });

    it('calculates live Katha display when area in sq ft is entered', async () => {
      await act(async () => {
        renderWithProviders(
          <PropertyFormModal
            isOpen={true}
            onClose={vi.fn()}
            defaultProjectId="0192a000-0000-7000-8000-000000000001"
          />,
          { queryClient, mockSecureStorage },
        );
      });

      const areaInput = screen.getByLabelText(/Area in Square Feet/i);
      await act(async () => {
        fireEvent.change(areaInput, { target: { value: '2880' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/≈ 4.00 katha/i)).toBeDefined();
      });
    });
  });

  describe('PropertyStatusOverrideModal — Audited Administrative Override', () => {
    it('requires mandatory audit justification reason of at least 5 characters', async () => {
      await act(async () => {
        renderWithProviders(
          <PropertyStatusOverrideModal
            isOpen={true}
            onClose={vi.fn()}
            property={mockProperties[0] ?? null}
          />,
          { queryClient, mockSecureStorage },
        );
      });

      expect(screen.getByText(/Elevated Administrative Action/i)).toBeDefined();
      expect(screen.getByText(/RULE-PROPERTY-STATUS/i)).toBeDefined();

      const overrideBtn = screen.getByRole('button', { name: /Override Status/i });
      await act(async () => {
        fireEvent.click(overrideBtn);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Mandatory audit reason must be at least 5 characters long/i),
        ).toBeDefined();
      });
    });
  });

  describe('PropertyDetailPage — Inspection & Audit Trail', () => {
    it('renders full unit details, specifications and status history in Asia/Dhaka', async () => {
      await act(async () => {
        renderWithProviders(<PropertyDetailPage />, {
          queryClient,
          mockSecureStorage,
          initialRoute: '/properties/prop-uuid-1',
        });
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'FLAT-3A' })).toBeDefined();
        expect(screen.getByText('Overview & Specifications')).toBeDefined();
        expect(screen.getByText('Pricing Breakdown')).toBeDefined();
        expect(screen.getByText(/Status History/i)).toBeDefined();
      });

      const historyTab = screen.getByRole('button', { name: /Status History/i });
      await act(async () => {
        fireEvent.click(historyTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/Initial unit inventory creation/i)).toBeDefined();
      });
    });
  });
});
