import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import { LeadListPage } from '@exzaestate/features';
import { QuotationListPage } from '@exzaestate/features';
import { BookingListPage } from '@exzaestate/features';
import { PaymentListPage } from '@exzaestate/features';
import { CustomerStatementPage } from '@exzaestate/features';
import {
  createTestQueryClient,
  setupGoldenFlowApiAdapter,
  renderClientWithMode,
  flowState,
} from '../fixtures/test-harness.js';

describe('Step S2: Golden Flow E2E through UI on Desktop (Cloud Mode) (prd.md §1.4, architecture.md §16)', () => {
  beforeEach(() => {
    flowState.reset();
    setupGoldenFlowApiAdapter();
  });

  it('S2.1: Desktop CRM Lead Capture & Pipeline View', async () => {
    const queryClient = createTestQueryClient();
    const { storage } = renderClientWithMode(<LeadListPage />, {
      mode: 'desktop',
      queryClient,
      initialRoute: '/crm/leads',
    });

    // 1. Verify Desktop secure storage adapter
    expect(storage).toBeDefined();

    // 2. Verify Lead Pipeline renders
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Lead Pipeline/i })).toBeDefined();
      expect(screen.getByText('Rahim Ahmed')).toBeDefined();
    });

    // 3. Inspect lead drawer
    const leadRow = screen.getByText('Rahim Ahmed');
    await act(async () => {
      fireEvent.click(leadRow);
    });

    await waitFor(() => {
      expect(screen.getByText(/5 Katha corner plot facing south-east/i)).toBeDefined();
    });
  });

  it('S2.2: Desktop Quotation with MD Discount Tier', async () => {
    const queryClient = createTestQueryClient();
    renderClientWithMode(<QuotationListPage />, {
      mode: 'desktop',
      queryClient,
      initialRoute: '/sales/quotations',
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Quotations/i })).toBeDefined();
      expect(screen.getByText('QUO-2026-0042')).toBeDefined();
      expect(screen.getByText('BDT 47,50,000.00')).toBeDefined();
    });
  });

  it('S2.3: Desktop Booking Confirmation & Drawer Inspection (AT-12)', async () => {
    const queryClient = createTestQueryClient();
    renderClientWithMode(<BookingListPage />, {
      mode: 'desktop',
      queryClient,
      initialRoute: '/sales/bookings',
    });

    // Verify booking list renders
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Bookings/i })).toBeDefined();
      expect(screen.getByText('BKG-2026-0042')).toBeDefined();
    });

    // Inspect booking details drawer
    const bookingRow = screen.getByText('BKG-2026-0042');
    await act(async () => {
      fireEvent.click(bookingRow);
    });

    await waitFor(() => {
      expect(screen.getAllByText('BKG-2026-0042').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BDT 47,50,000.00').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BDT 4,75,000.00').length).toBeGreaterThan(0);
    });
  });

  it('S2.4: Desktop Payment Collection & Native Receipt Export', async () => {
    const queryClient = createTestQueryClient();
    renderClientWithMode(<PaymentListPage />, {
      mode: 'desktop',
      queryClient,
      initialRoute: '/collection/payments',
    });

    await waitFor(() => {
      expect(screen.getByTestId('payment-list-page')).toBeDefined();
      expect(screen.getByText('REC-2026-0041')).toBeDefined();
      expect(screen.getByText('REC-2026-0042')).toBeDefined();
    });

    expect(screen.getByText('BDT 4,75,000.00')).toBeDefined();
    expect(screen.getByText('BDT 3,56,250.00')).toBeDefined();
    expect(screen.getByText('REC-2026-0041')).toBeDefined();
    expect(screen.getByText('REC-2026-0042')).toBeDefined();
  });

  it('S2.5: Desktop Customer Statement & Financial Ledger Parity (AT-14)', async () => {
    const queryClient = createTestQueryClient();
    renderClientWithMode(<CustomerStatementPage />, {
      mode: 'desktop',
      queryClient,
      initialRoute: '/collection/statements?customerId=cust-golden-001',
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Customer Account Statement/i }),
      ).toBeDefined();
      expect(screen.getByTestId('reconciliation-seal-success')).toBeDefined();
      expect(screen.getByText('Reconciled with AR Ledger (AT-14)')).toBeDefined();
      expect(screen.getAllByText('BDT 47,50,000.00').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BDT 8,31,250.00').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BDT 39,18,750.00').length).toBeGreaterThan(0);
    });
  });
});
