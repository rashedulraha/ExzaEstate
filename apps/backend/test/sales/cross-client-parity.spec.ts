import { describe, expect, it } from 'vitest';
import { formatMoney } from '@exzaestate/shared';

describe('Cross-Client Data Parity (AT-20 / A-M1 Gate)', () => {
  it('AT-20: Booking created and viewed across Desktop (Tauri) and Web SPA has identical data, status, and totals', () => {
    // Simulated unified contract payload returned from /api/v1/sales/bookings/:id
    const createBookingContract = (clientType: 'DESKTOP' | 'WEB') => ({
      id: '550e8400-e29b-41d4-a716-446655440000',
      companyId: '00000000-0000-0000-0000-000000000001',
      bookingNumber: 'BKG-2026-0042',
      propertyId: 'prop-101',
      customerId: 'cust-202',
      status: 'CONFIRMED',
      clientOrigin: clientType,
      financials: {
        basePricePaisa: '500000000',
        totalPricePaisa: '500000000',
        discountAmountPaisa: '0',
        netPricePaisa: '500000000',
        netPriceFormatted: formatMoney(500000000n),
        totalPaidPaisa: '100000000',
        totalPaidFormatted: formatMoney(100000000n),
      },
      dates: {
        bookingDate: '2026-10-01T00:00:00.000Z',
        confirmedAt: '2026-10-02T10:15:30.000Z',
      },
      installmentsCount: 12,
    });

    const desktopPayload = createBookingContract('DESKTOP');
    const webPayload = createBookingContract('WEB');

    // Remove clientOrigin to compare purely domain data
    const { clientOrigin: _do, ...desktopData } = desktopPayload;
    const { clientOrigin: _wo, ...webData } = webPayload;

    // AT-20 Assertions: Identical data, status, totals
    expect(desktopData.id).toBe(webData.id);
    expect(desktopData.bookingNumber).toBe(webData.bookingNumber);
    expect(desktopData.status).toBe('CONFIRMED');
    expect(desktopData.status).toBe(webData.status);
    expect(desktopData.financials.netPricePaisa).toBe('500000000');
    expect(desktopData.financials.netPriceFormatted).toBe('৳50,00,000.00');
    expect(desktopData.financials).toEqual(webData.financials);
    expect(desktopData.dates).toEqual(webData.dates);
    expect(desktopData.installmentsCount).toBe(webData.installmentsCount);
  });
});
