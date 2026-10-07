import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { computeQuotationKpis } from './hooks/useQuotationList.js';
import { computeBookingKpis } from './hooks/useBookingList.js';
import { computeAgreementKpis } from './hooks/useAgreementList.js';
import { QuotationDataTable } from './components/quotations/QuotationDataTable.js';
import { QuotationPdfPreviewModal } from './components/quotations/QuotationPdfPreviewModal.js';
import { BookingDataTable } from './components/bookings/BookingDataTable.js';
import { BookingReservationTimer } from './components/bookings/BookingReservationTimer.js';
import { AgreementDataTable } from './components/agreements/AgreementDataTable.js';
import { AgreementViewerModal } from './components/agreements/AgreementViewerModal.js';
import { BookingWizardStepper } from './components/bookings/BookingWizard/BookingWizardStepper.js';
import type { QuotationItem } from './schemas/quotation.schema.js';
import type { BookingItem } from './schemas/booking.schema.js';
import type { AgreementItem } from './schemas/agreement.schema.js';

const mockQuotations: QuotationItem[] = [
  {
    id: 'quote-1',
    quotationNumber: 'QT-2026-0001',
    status: 'DRAFT',
    propertyId: 'prop-1',
    propertyCode: 'FLAT-3A',
    partyName: 'Rahim Khan',
    partyType: 'CUSTOMER',
    basePricePaisa: '500000000',
    premiumAmountPaisa: '20000000',
    discountAmountPaisa: '10000000',
    discountPct: 2,
    netPricePaisa: '510000000',
    validUntil: '2026-12-31T23:59:59.000Z',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'quote-2',
    quotationNumber: 'QT-2026-0002',
    status: 'PENDING_APPROVAL',
    propertyId: 'prop-2',
    propertyCode: 'PLOT-12',
    partyName: 'Farhana Sultana',
    partyType: 'LEAD',
    basePricePaisa: '1200000000',
    premiumAmountPaisa: '0',
    discountAmountPaisa: '60000000',
    discountPct: 5,
    netPricePaisa: '1140000000',
    validUntil: '2026-12-31T23:59:59.000Z',
    createdAt: '2026-10-02T10:00:00.000Z',
  },
];

const mockBookings: BookingItem[] = [
  {
    id: 'book-1',
    bookingNumber: 'BK-2026-0010',
    propertyId: 'prop-1',
    propertyCode: 'FLAT-3A',
    customerId: 'cust-1',
    customerName: 'Rahim Khan',
    status: 'REQUESTED',
    basePricePaisa: '500000000',
    totalPricePaisa: '520000000',
    discountAmountPaisa: '10000000',
    discountPercentage: 2,
    netPricePaisa: '510000000',
    bookingAmountPaisa: '50000000',
    downPaymentPaisa: '100000000',
    totalPaidPaisa: '50000000',
    reservationHoldHours: 72,
    bookingDate: '2026-10-01T10:00:00.000Z',
    expiresAt: '2026-12-31T10:00:00.000Z',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'book-2',
    bookingNumber: 'BK-2026-0011',
    propertyId: 'prop-2',
    propertyCode: 'PLOT-12',
    customerId: 'cust-2',
    customerName: 'Farhana Sultana',
    status: 'CONFIRMED',
    basePricePaisa: '1200000000',
    totalPricePaisa: '1200000000',
    discountAmountPaisa: '0',
    discountPercentage: 0,
    netPricePaisa: '1200000000',
    bookingAmountPaisa: '100000000',
    downPaymentPaisa: '200000000',
    totalPaidPaisa: '300000000',
    reservationHoldHours: 72,
    bookingDate: '2026-10-02T10:00:00.000Z',
    expiresAt: null,
    createdAt: '2026-10-02T10:00:00.000Z',
  },
];

const mockAgreements: AgreementItem[] = [
  {
    id: 'agr-1',
    agreementNumber: 'AGR-2026-0042',
    bookingId: 'book-1',
    bookingNumber: 'BK-2026-0010',
    customerName: 'Rahim Khan',
    propertyCode: 'FLAT-3A',
    title: 'Agreement for Allotment & Sale',
    status: 'AGREEMENT_PENDING',
    version: 1,
    signedAt: null,
    lockedAt: null,
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
  },
  {
    id: 'agr-2',
    agreementNumber: 'AGR-2026-0043',
    bookingId: 'book-2',
    bookingNumber: 'BK-2026-0011',
    customerName: 'Farhana Sultana',
    propertyCode: 'PLOT-12',
    title: 'Deed of Allotment',
    status: 'AGREEMENT_COMPLETED',
    version: 2,
    signedAt: '2026-10-03T10:00:00.000Z',
    lockedAt: '2026-10-03T10:00:00.000Z',
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-03T10:00:00.000Z',
  },
];

describe('Sales Feature Module (B3)', () => {
  it('computes quotation KPIs accurately', () => {
    const kpis = computeQuotationKpis(mockQuotations);
    expect(kpis.totalCount).toBe(2);
    expect(kpis.pendingApprovalCount).toBe(1);
    expect(kpis.acceptedCount).toBe(0);
    expect(kpis.convertedCount).toBe(0);
  });

  it('computes booking KPIs accurately', () => {
    const kpis = computeBookingKpis(mockBookings);
    expect(kpis.totalCount).toBe(2);
    expect(kpis.requestedCount).toBe(1);
    expect(kpis.pendingApprovalCount).toBe(0);
    expect(kpis.confirmedCount).toBe(1);
  });

  it('computes agreement KPIs accurately', () => {
    const kpis = computeAgreementKpis(mockAgreements);
    expect(kpis.totalCount).toBe(2);
    expect(kpis.pendingSignatureCount).toBe(1);
    expect(kpis.signedAndLockedCount).toBe(1);
  });

  it('renders QuotationDataTable with BDT currency formatting and actions', () => {
    const onPreview = vi.fn();
    const onSend = vi.fn();
    const onConvert = vi.fn();

    render(
      <QuotationDataTable
        quotations={mockQuotations}
        isLoading={false}
        onPreviewPdf={onPreview}
        onSend={onSend}
        onConvertToBooking={onConvert}
      />,
    );

    expect(screen.getByText('QT-2026-0001')).toBeDefined();
    expect(screen.getByText('Rahim Khan')).toBeDefined();
    expect(screen.getByText('BDT 51,00,000.00')).toBeDefined();

    const pdfBtn = screen.getAllByRole('button', { name: /pdf/i })[0];
    if (pdfBtn) {
      fireEvent.click(pdfBtn);
      expect(onPreview).toHaveBeenCalledWith(mockQuotations[0]);
    }
  });

  it('renders QuotationPdfPreviewModal with commercial pricing breakdown', () => {
    render(
      <QuotationPdfPreviewModal
        isOpen={true}
        onClose={() => {}}
        quotation={mockQuotations[0] ?? null}
      />,
    );

    expect(screen.getByText('Quotation QT-2026-0001')).toBeDefined();
    expect(screen.getByText('EXZA ESTATE ERP')).toBeDefined();
    expect(screen.getByText('BDT 51,00,000.00')).toBeDefined();
  });

  it('renders BookingDataTable with reservation timer and deposit paid', () => {
    const onSelect = vi.fn();
    render(
      <BookingDataTable bookings={mockBookings} isLoading={false} onSelectBooking={onSelect} />,
    );

    expect(screen.getByText('BK-2026-0010')).toBeDefined();
    expect(screen.getByText('Rahim Khan')).toBeDefined();
    expect(screen.getByText('BDT 51,00,000.00')).toBeDefined();
    expect(screen.getByText('BDT 5,00,000.00')).toBeDefined();
  });

  it('renders BookingReservationTimer for REQUESTED status and hides for confirmed', () => {
    const { container: activeContainer } = render(
      <BookingReservationTimer expiresAt="2026-12-31T23:59:59.000Z" status="REQUESTED" />,
    );
    expect(activeContainer.querySelector('span')).not.toBeNull();

    const { container: confirmedContainer } = render(
      <BookingReservationTimer expiresAt="2026-12-31T23:59:59.000Z" status="CONFIRMED" />,
    );
    expect(confirmedContainer.innerHTML).toBe('');
  });

  it('renders AgreementDataTable with versioning and execution status', () => {
    const onView = vi.fn();
    const onSign = vi.fn();

    render(
      <AgreementDataTable
        agreements={mockAgreements}
        isLoading={false}
        onViewAgreement={onView}
        onSignAndLock={onSign}
      />,
    );

    expect(screen.getByText('AGR-2026-0042')).toBeDefined();
    expect(screen.getByText(/v1 • Agreement for Allotment/i)).toBeDefined();
    expect(screen.getByText('Execution Pending')).toBeDefined();
    expect(screen.getByText('AGR-2026-0043')).toBeDefined();
    expect(screen.getByText(/v2 • Deed of Allotment/i)).toBeDefined();
  });

  it('renders AgreementViewerModal with legal terms and immutable lock rules', () => {
    const onSign = vi.fn();

    render(
      <AgreementViewerModal
        isOpen={true}
        onClose={() => {}}
        agreement={mockAgreements[0] ?? null}
        onSignAndLock={onSign}
        isLoading={false}
      />,
    );

    expect(screen.getByText(/AGREEMENT FOR SALE AND ALLOTMENT/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign & Lock Instrument/i })).toBeDefined();
  });

  it('renders BookingWizardStepper with all 7 sequential steps', () => {
    const onStepClick = vi.fn();
    render(<BookingWizardStepper currentStep={3} onStepClick={onStepClick} />);

    expect(screen.getByText('Property')).toBeDefined();
    expect(screen.getByText('Buyers')).toBeDefined();
    expect(screen.getByText('Pricing')).toBeDefined();
    expect(screen.getByText('Plan')).toBeDefined();
    expect(screen.getByText('Nominee')).toBeDefined();
    expect(screen.getByText('Attribution')).toBeDefined();
    expect(screen.getByText('Review')).toBeDefined();
  });
});
