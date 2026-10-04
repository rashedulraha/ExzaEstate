import { Inject, Injectable } from '@nestjs/common';
import { PDF_RENDERER } from '../../../ports/tokens.js';
import type { PdfRenderer } from '../../../ports/pdf-renderer.port.js';
import { generateQuotationHtml, type QuotationPdfData } from './quotation-pdf.template.js';

@Injectable()
export class QuotationPdfService {
  constructor(
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer: PdfRenderer,
  ) {}

  async generatePdf(data: QuotationPdfData): Promise<Buffer> {
    const html = generateQuotationHtml(data);
    return this.pdfRenderer.render(html, {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm',
      },
    });
  }
}
