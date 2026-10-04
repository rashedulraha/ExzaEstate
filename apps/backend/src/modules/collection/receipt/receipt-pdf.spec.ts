import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { AuditService } from '../../../platform/audit/audit.service.js';
import type { PdfRenderer } from '../../../ports/index.js';
import { ReceiptService } from './receipt.service.js';
import { renderQuotationHtml, type QuotationTemplateData } from '../../sales/quotation/templates/quotation.template.js';

describe('Bangla Templates & Receipt PDF (A9.2 S3, S4 / AT-39)', () => {
  let receiptService: ReceiptService;
  let mockTenantDb: Partial<TenantDb>;
  let mockAuditService: Partial<AuditService>;
  let mockPdfRenderer: Partial<PdfRenderer>;
  let renderedHtmlCapture: string;

  const companyId = '00000000-0000-0000-0000-000000000001';
  const receiptId = '00000000-0000-0000-0000-000000000010';

  beforeEach(() => {
    renderedHtmlCapture = '';
    mockPdfRenderer = {
      render: vi.fn().mockImplementation((html: string) => {
        renderedHtmlCapture = html;
        return Promise.resolve(Buffer.from(`%PDF-1.4 Mock PDF for ${html.length} bytes`));
      }),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    const mockReceipt = {
      id: receiptId,
      companyId,
      receiptNumber: 'MR-2026-00042',
      paymentId: 'pay-1',
      bookingId: 'bkg-1',
      customerId: 'cust-1',
      propertyId: 'prop-1',
      projectId: 'proj-1',
      amountPaisa: 500000000n, // ৳50,00,000 (Fifty Lakh Taka)
      previousDuePaisa: 1500000000n,
      currentDuePaisa: 1000000000n,
      amountInWords: 'Fifty Lakh Taka Only',
      paymentMethod: 'CHEQUE',
      isVoid: false,
      reprintCount: 0,
      issuedAt: new Date('2026-10-05T10:00:00Z'),
      createdAt: new Date('2026-10-05T10:00:00Z'),
      customer: { name: 'রহিম উল্লাহ', phone: '01711223344' },
      company: { name: 'এক্সজা এস্টেট লিমিটেড' },
      property: { code: 'A-402' },
      project: { name: 'গুলশান ভ্যালি' },
    };

    mockTenantDb = {
      withCompany: vi.fn().mockImplementation((_cid, cb) =>
        cb({
          receipt: {
            findFirst: vi.fn().mockResolvedValue(mockReceipt),
          },
          company: {
            findUnique: vi.fn().mockResolvedValue({ name: 'এক্সজা এস্টেট লিমিটেড' }),
          },
          property: {
            findUnique: vi.fn().mockResolvedValue({ code: 'A-402' }),
          },
          project: {
            findUnique: vi.fn().mockResolvedValue({ name: 'গুলশান ভ্যালি' }),
          },
        } as unknown as TenantPrisma),
      ),
    };

    receiptService = new ReceiptService(
      mockTenantDb as TenantDb,
      mockAuditService as AuditService,
      mockPdfRenderer as PdfRenderer,
    );
  });

  it('AT-39: generates receipt in Bengali ("bn") with Bengali text and amount-in-words', async () => {
    const pdfBuffer = await receiptService.generateReceiptPdf(companyId, receiptId, 'bn');

    expect(pdfBuffer).toBeDefined();
    expect(mockPdfRenderer.render).toHaveBeenCalled();

    // Verify Bengali headers and labels in generated HTML
    expect(renderedHtmlCapture).toContain('টাকা জমার রসিদ');
    expect(renderedHtmlCapture).toContain('রসিদ নং');
    expect(renderedHtmlCapture).toContain('রহিম উল্লাহ');
    expect(renderedHtmlCapture).toContain('গুলশান ভ্যালি');
    expect(renderedHtmlCapture).toContain('A-402');

    // Verify Bengali amount-in-words (S4 & AT-39): "পঞ্চাশ লক্ষ টাকা মাত্র"
    expect(renderedHtmlCapture).toContain('পঞ্চাশ লক্ষ টাকা মাত্র');
  });

  it('generates receipt in English ("en") with English text and amount-in-words', async () => {
    const pdfBuffer = await receiptService.generateReceiptPdf(companyId, receiptId, 'en');

    expect(pdfBuffer).toBeDefined();
    expect(renderedHtmlCapture).toContain('MONEY RECEIPT');
    expect(renderedHtmlCapture).toContain('Fifty Lakh Taka Only');
    expect(renderedHtmlCapture).toContain('Receipt No');
  });

  it('renders Price Quotation in Bengali with payment plan', () => {
    const quoteData: QuotationTemplateData = {
      quotationNumber: 'QT-2026-001',
      companyName: 'এক্সজা এস্টেট লিমিটেড',
      customerName: 'করিম হোসেন',
      customerPhone: '01811223344',
      projectName: 'বারিধারা লেকসিটি',
      propertyCode: 'B-1201',
      propertyType: 'Residential Apartment',
      areaSqft: 2200,
      ratePerSqftFormatted: '৳১০,০০০',
      totalPriceFormatted: '৳২,২০,০০,০০০',
      totalPriceInWords: 'দুই কোটি বিশ লক্ষ টাকা মাত্র',
      bookingAmountFormatted: '৳১০,০০,০০০',
      downpaymentFormatted: '৳৪০,০০,০০০',
      numberOfInstallments: 36,
      installmentAmountFormatted: '৳৪,৭২,২২২',
      validUntil: '2026-11-05',
      issuedAt: '2026-10-05',
    };

    const htmlBn = renderQuotationHtml(quoteData, 'bn');
    expect(htmlBn).toContain('মূল্য প্রস্তাবনা ও বুকিং বিবরণী');
    expect(htmlBn).toContain('দুই কোটি বিশ লক্ষ টাকা মাত্র');
    expect(htmlBn).toContain('বারিধারা লেকসিটি');
  });
});
