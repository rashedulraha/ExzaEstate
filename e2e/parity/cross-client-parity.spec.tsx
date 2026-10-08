import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { BookingListPage, PaymentListPage, CustomerStatementPage } from '@exzaestate/features';
import { formatMoney } from '@exzaestate/shared';
import {
  createTestQueryClient,
  setupGoldenFlowApiAdapter,
  renderClientWithMode,
  flowState,
} from '../fixtures/test-harness.js';

describe('Step S3: Cross-Client Data & Calculation Parity (@AT-20 / prd.md AT-20)', () => {
  beforeEach(() => {
    flowState.reset();
    setupGoldenFlowApiAdapter();
  });

  it('AT-20: Booking created on Desktop is identical (data, status, totals) when viewed on Web', async () => {
    // 1. Desktop Execution: Render BookingListPage on Desktop client
    const desktopQueryClient = createTestQueryClient();
    const desktopRender = renderClientWithMode(<BookingListPage />, {
      mode: 'desktop',
      queryClient: desktopQueryClient,
      initialRoute: '/sales/bookings',
    });

    await waitFor(() => {
      expect(screen.getByText('BKG-2026-0042')).toBeDefined();
    });

    const desktopBookingData = {
      id: flowState.booking.id,
      bookingNumber: flowState.booking.bookingNumber,
      propertyId: flowState.booking.propertyId,
      customerId: flowState.booking.customerId,
      status: flowState.booking.status,
      basePricePaisa: flowState.booking.basePricePaisa,
      netPricePaisa: flowState.booking.netPricePaisa,
      netPriceFormatted: formatMoney(flowState.booking.netPricePaisa),
      totalPaidPaisa: flowState.booking.totalPaidPaisa,
      totalPaidFormatted: formatMoney(flowState.booking.totalPaidPaisa),
      outstandingBalancePaisa: (
        BigInt(flowState.booking.netPricePaisa) - BigInt(flowState.booking.totalPaidPaisa)
      ).toString(),
      outstandingBalanceFormatted: formatMoney(
        BigInt(flowState.booking.netPricePaisa) - BigInt(flowState.booking.totalPaidPaisa),
      ),
      installmentsCount: flowState.schedule.length,
      paidInstallmentsCount: flowState.schedule.filter((i) => i.status === 'PAID').length,
    };

    desktopRender.unmount();

    // 2. Web Execution: Render same booking on Web SPA client
    const webQueryClient = createTestQueryClient();
    renderClientWithMode(<BookingListPage />, {
      mode: 'web',
      queryClient: webQueryClient,
      initialRoute: '/sales/bookings',
    });

    await waitFor(() => {
      expect(screen.getByText('BKG-2026-0042')).toBeDefined();
    });

    const webBookingData = {
      id: flowState.booking.id,
      bookingNumber: flowState.booking.bookingNumber,
      propertyId: flowState.booking.propertyId,
      customerId: flowState.booking.customerId,
      status: flowState.booking.status,
      basePricePaisa: flowState.booking.basePricePaisa,
      netPricePaisa: flowState.booking.netPricePaisa,
      netPriceFormatted: formatMoney(flowState.booking.netPricePaisa),
      totalPaidPaisa: flowState.booking.totalPaidPaisa,
      totalPaidFormatted: formatMoney(flowState.booking.totalPaidPaisa),
      outstandingBalancePaisa: (
        BigInt(flowState.booking.netPricePaisa) - BigInt(flowState.booking.totalPaidPaisa)
      ).toString(),
      outstandingBalanceFormatted: formatMoney(
        BigInt(flowState.booking.netPricePaisa) - BigInt(flowState.booking.totalPaidPaisa),
      ),
      installmentsCount: flowState.schedule.length,
      paidInstallmentsCount: flowState.schedule.filter((i) => i.status === 'PAID').length,
    };

    // 3. Strict AT-20 Cross-Client Parity Assertions
    expect(webBookingData.id).toBe(desktopBookingData.id);
    expect(webBookingData.bookingNumber).toBe(desktopBookingData.bookingNumber);
    expect(webBookingData.propertyId).toBe(desktopBookingData.propertyId);
    expect(webBookingData.customerId).toBe(desktopBookingData.customerId);
    expect(webBookingData.status).toBe('CONFIRMED');
    expect(webBookingData.status).toBe(desktopBookingData.status);

    // Exact financial parity
    expect(webBookingData.basePricePaisa).toBe(desktopBookingData.basePricePaisa);
    expect(webBookingData.netPricePaisa).toBe(desktopBookingData.netPricePaisa);
    expect(webBookingData.netPriceFormatted).toBe('BDT 47,50,000.00');
    expect(webBookingData.netPriceFormatted).toBe(desktopBookingData.netPriceFormatted);
    expect(webBookingData.totalPaidPaisa).toBe(desktopBookingData.totalPaidPaisa);
    expect(webBookingData.totalPaidFormatted).toBe('BDT 8,31,250.00');
    expect(webBookingData.totalPaidFormatted).toBe(desktopBookingData.totalPaidFormatted);
    expect(webBookingData.outstandingBalancePaisa).toBe(desktopBookingData.outstandingBalancePaisa);
    expect(webBookingData.outstandingBalanceFormatted).toBe('BDT 39,18,750.00');

    // Schedule counts and status parity
    expect(webBookingData.installmentsCount).toBe(12);
    expect(webBookingData.installmentsCount).toBe(desktopBookingData.installmentsCount);
    expect(webBookingData.paidInstallmentsCount).toBe(1);
    expect(webBookingData.paidInstallmentsCount).toBe(desktopBookingData.paidInstallmentsCount);
  });

  it('AT-20.2: Payment & Money Receipt parity across Desktop and Web clients', async () => {
    // 1. Verify payments on Desktop
    const desktopQueryClient = createTestQueryClient();
    const desktopRender = renderClientWithMode(<PaymentListPage />, {
      mode: 'desktop',
      queryClient: desktopQueryClient,
      initialRoute: '/collection/payments',
    });

    await waitFor(() => {
      expect(screen.getByText('REC-2026-0041')).toBeDefined();
      expect(screen.getByText('REC-2026-0042')).toBeDefined();
    });

    const desktopPayments = [...flowState.payments];
    desktopRender.unmount();

    // 2. Verify payments on Web
    const webQueryClient = createTestQueryClient();
    renderClientWithMode(<PaymentListPage />, {
      mode: 'web',
      queryClient: webQueryClient,
      initialRoute: '/collection/payments',
    });

    await waitFor(() => {
      expect(screen.getByText('REC-2026-0041')).toBeDefined();
      expect(screen.getByText('REC-2026-0042')).toBeDefined();
    });

    const webPayments = [...flowState.payments];

    // Assert payment array parity
    expect(webPayments.length).toBe(desktopPayments.length);
    for (let i = 0; i < webPayments.length; i++) {
      expect(webPayments[i]?.id).toBe(desktopPayments[i]?.id);
      expect(webPayments[i]?.paymentNumber).toBe(desktopPayments[i]?.paymentNumber);
      expect(webPayments[i]?.receiptNumber).toBe(desktopPayments[i]?.receiptNumber);
      expect(webPayments[i]?.amountPaisa).toBe(desktopPayments[i]?.amountPaisa);
      expect(webPayments[i]?.amountFormatted).toBe(desktopPayments[i]?.amountFormatted);
      expect(webPayments[i]?.status).toBe(desktopPayments[i]?.status);
    }
  });

  it('AT-20.3: Customer Statement balance parity between Desktop and Web', async () => {
    const desktopQueryClient = createTestQueryClient();
    const desktopRender = renderClientWithMode(<CustomerStatementPage />, {
      mode: 'desktop',
      queryClient: desktopQueryClient,
      initialRoute: '/collection/statements?customerId=cust-golden-001',
    });

    await waitFor(() => {
      expect(screen.getAllByText('BDT 47,50,000.00').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BDT 8,31,250.00').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BDT 39,18,750.00').length).toBeGreaterThan(0);
    });

    desktopRender.unmount();

    const webQueryClient = createTestQueryClient();
    renderClientWithMode(<CustomerStatementPage />, {
      mode: 'web',
      queryClient: webQueryClient,
      initialRoute: '/collection/statements?customerId=cust-golden-001',
    });

    await waitFor(() => {
      expect(screen.getAllByText('BDT 47,50,000.00').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BDT 8,31,250.00').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BDT 39,18,750.00').length).toBeGreaterThan(0);
    });
  });
});
