import { Inject, Injectable } from '@nestjs/common';
import { PDF_RENDERER } from '../../../../ports/tokens.js';
import type { PdfRenderer } from '../../../../ports/pdf-renderer.port.js';
import { generateAgreementHtml, type AgreementPdfData } from './agreement-pdf.template.js';

@Injectable()
export class AgreementPdfService {
  constructor(
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer: PdfRenderer,
  ) {}

  async generatePdf(data: AgreementPdfData): Promise<Buffer> {
    const html = generateAgreementHtml(data);
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
