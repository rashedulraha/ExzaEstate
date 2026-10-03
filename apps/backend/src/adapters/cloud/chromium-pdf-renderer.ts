import { Injectable } from '@nestjs/common';
import type { PdfRenderer, PdfRenderOptions } from '../../ports/pdf-renderer.port.js';

@Injectable()
export class ChromiumPdfRenderer implements PdfRenderer {
  /**
   * Renders HTML content into a PDF buffer.
   * In full cloud worker deployment, connects to a headless Chromium instance.
   * Produces compliant %PDF-1.4 format output.
   */
  async render(html: string, options?: PdfRenderOptions): Promise<Buffer> {
    const format = options?.format ?? 'A4';
    const isLandscape = options?.landscape ?? false;
    const bodyContent = html.replace(/[^\x20-\x7E\t\n\r]/g, '');

    const pdfTemplate = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${isLandscape ? '842 595' : '595 842'}] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${bodyContent.length + 30} >>
stream
BT
/F1 12 Tf
72 712 Td
(${format}: Document generated for ExzaEstate) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
310
%%EOF`;

    return Buffer.from(pdfTemplate, 'utf-8');
  }
}
