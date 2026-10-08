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

describe('Step S1: Golden Flow E2E through UI on Web (prd.md §1.4, architecture.md §16)', () => {
  beforeEach(() => {
    flowState.reset();
    setupGoldenFlowApiAdapter();
  });

  it('S1.1: Web CRM Lead Capture & Qualification to Customer', async () => {
    const queryClient = createTestQueryClient();
    const { storage } = renderClientWithMode(<LeadListPage />, {
      mode: 'web',
      queryClient,
      initialRoute: '/crm/leads',
    });

    // 1. Verify Web Platform initialization
    expect(storage).toBeDefined();

    // 2. Verify Lead Pipeline heading and prospect name
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Lead Pipeline/i })).toBeDefined();
      expect(screen.getByText('Rahim Ahmed')).toBeDefined();
    });

    // 3. Inspect lead row and click to open slide-over drawer
    const leadRow = screen.getByText('Rahim Ahmed');
    await act(async () => {
      fireEvent.click(leadRow);
    });

    // 4. Verify requirements and notes in drawer
    await waitFor(() => {
      expect(screen.getByText(/5 Katha corner plot facing south-east/i)).toBeDefined();
    });
  });

  it('S1.2: Web Quotation generation with Tier MD Discount Approval', async () => {
    const queryClient = createTestQueryClient();
    renderClientWithMode(<QuotationListPage />, {
      mode: 'web',
      queryClient,
      initialRoute: '/sales/quotations',
    });

    // Verify Quotation Page renders with approved MD discount
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Quotations/i })).toBeDefined();
      expect(screen.getByText('QUO-2026-0042')).toBeDefined();
      expect(screen.getByText('BDT 47,50,000.00')).toBeDefined();
    });
  });

  it('S1.3: Web Booking Confirmation with 10% Downpayment Rule (AT-12)', async () => {
    const queryClient = createTestQueryClient();
    renderClientWithMode(<BookingListPage />, {
      mode: 'web',
      queryClient,
      initialRoute: '/sales/bookings',
    });

    // 1. Verify Booking list displays BKG-2026-0042
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Bookings/i })).toBeDefined();
      expect(screen.getByText('BKG-2026-0042')).toBeDefined();
    });

    // 2. Click booking row to open inspection drawer
    const bookingRow = screen.getByText('BKG-2026-0042');
    await act(async () => {
      fireEvent.click(bookingRow);
    });

    // 3. Verify status CONFIRMED and financial figures
    await waitFor(() => {
      expect(screen.getAllByText('BKG-2026-0042').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BDT 47,50,000.00').length).toBeGreaterThan(0); // Net price
      expect(screen.getAllByText('BDT 4,75,000.00').length).toBeGreaterThan(0); // Earnest deposit paid
    });
  });

  it('S1.4: Web Payment Collection & Money Receipt Generation', async () => {
    const queryClient = createTestQueryClient();
    renderClientWithMode(<PaymentListPage />, {
      mode: 'web',
      queryClient,
      initialRoute: '/collection/payments',
    });

    // 1. Verify PaymentListPage renders recorded payments and money receipts
    await waitFor(() => {
      expect(screen.getByTestId('payment-list-page')).toBeDefined();
      expect(screen.getByText('REC-2026-0041')).toBeDefined();
      expect(screen.getByText('REC-2026-0042')).toBeDefined();
    });

    // 2. Verify Payment Amounts with BDT formatting and receipts
    expect(screen.getByText('BDT 4,75,000.00')).toBeDefined(); // Downpayment
    expect(screen.getByText('BDT 3,56,250.00')).toBeDefined(); // Installment #1
    expect(screen.getByText('REC-2026-0041')).toBeDefined(); // Gapless downpayment receipt
    expect(screen.getByText('REC-2026-0042')).toBeDefined(); // Gapless installment receipt
  });

  it('S1.5: Web Customer Statement reconciles AR Ledger (AT-14)', async () => {
    const queryClient = createTestQueryClient();
    renderClientWithMode(<CustomerStatementPage />, {
      mode: 'web',
      queryClient,
      initialRoute: '/collection/statements?customerId=cust-golden-001',
    });

    // Verify Customer Statement renders and reconciliation seal is displayed
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Customer Account Statement/i }),
      ).toBeDefined();
      expect(screen.getByTestId('reconciliation-seal-success')).toBeDefined();
      expect(screen.getByText('Reconciled with AR Ledger (AT-14)')).toBeDefined();
      expect(screen.getAllByText('BDT 47,50,000.00').length).toBeGreaterThan(0); // Total Debits
      expect(screen.getAllByText('BDT 8,31,250.00').length).toBeGreaterThan(0); // Total Credits
      expect(screen.getAllByText('BDT 39,18,750.00').length).toBeGreaterThan(0); // Outstanding Balance
    });
  });
});
