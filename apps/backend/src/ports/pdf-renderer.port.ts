export interface PdfRenderOptions {
  format?: 'A4' | 'Letter';
  landscape?: boolean;
  printBackground?: boolean;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

/**
 * PdfRenderer Port
 * HTML to PDF generation for agreements, vouchers, receipts, and reports.
 * Implemented by ChromiumPdfRenderer in Cloud mode, and LocalPdfRenderer in Local mode.
 */
export interface PdfRenderer {
  render(html: string, options?: PdfRenderOptions): Promise<Buffer>;
}
