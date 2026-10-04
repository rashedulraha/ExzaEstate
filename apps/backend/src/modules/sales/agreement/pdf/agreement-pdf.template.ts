import { formatMoney } from '@exzaestate/shared';

export interface AgreementPdfData {
  companyName: string;
  companyAddress?: string;
  agreementNumber: string;
  version: number;
  status: string;
  title: string;
  content: string;
  terms?: string | null;
  customerName: string;
  customerPhone?: string;
  propertyCode: string;
  propertyTitle: string;
  netPricePaisa: bigint;
  bookingNumber: string;
  signedAt?: string | null;
}

function getStatusBadgeClass(status: string): string {
  if (status === 'Signed & Locked') return 'badge-locked';
  if (status === 'Superseded') return 'badge-superseded';
  return '';
}

export function generateAgreementHtml(data: AgreementPdfData): string {
  const badgeClass = getStatusBadgeClass(data.status);
  const formattedPrice = formatMoney(data.netPricePaisa);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      font-size: 10pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-title {
      font-size: 16pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .company-sub {
      font-size: 8.5pt;
      color: #64748b;
    }
    .meta-box {
      text-align: right;
      font-size: 8.5pt;
    }
    .doc-num {
      font-size: 12pt;
      font-weight: 700;
      color: #0f172a;
      font-family: monospace;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 4px;
      background: #e2e8f0;
      color: #334155;
    }
    .badge-locked {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    .badge-superseded {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .agreement-title {
      font-size: 14pt;
      font-weight: 700;
      text-align: center;
      margin: 20px 0 16px 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
      background: #f8fafc;
      border: 0.5pt solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      font-size: 9pt;
    }
    .summary-item strong {
      color: #475569;
      display: inline-block;
      width: 120px;
    }
    .content-body {
      white-space: pre-wrap;
      font-size: 9.5pt;
      line-height: 1.6;
      margin-bottom: 24px;
      color: #1e293b;
    }
    .terms-box {
      border-top: 0.5pt solid #e2e8f0;
      padding-top: 12px;
      margin-top: 16px;
      font-size: 8.5pt;
      color: #475569;
    }
    .terms-title {
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .signatory-section {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      page-break-inside: avoid;
    }
    .sign-box {
      border-top: 0.5pt solid #94a3b8;
      padding-top: 8px;
      text-align: center;
      font-size: 8pt;
      color: #64748b;
    }
    .sign-role {
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #94a3b8;
      border-top: 0.5pt solid #e2e8f0;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-title">${escapeHtml(data.companyName)}</div>
      <div class="company-sub">${escapeHtml(data.companyAddress ?? 'Dhaka, Bangladesh')}</div>
    </div>
    <div class="meta-box">
      <div class="doc-num">${escapeHtml(data.agreementNumber)} (v${data.version})</div>
      <div>Ref Booking: ${escapeHtml(data.bookingNumber)}</div>
      <div class="badge ${badgeClass}">${escapeHtml(data.status)}</div>
    </div>
  </div>

  <div class="agreement-title">${escapeHtml(data.title)}</div>

  <div class="summary-grid">
    <div class="summary-item"><strong>First Party:</strong> ${escapeHtml(data.companyName)}</div>
    <div class="summary-item"><strong>Second Party:</strong> ${escapeHtml(data.customerName)}</div>
    <div class="summary-item"><strong>Property:</strong> ${escapeHtml(data.propertyTitle)} (${escapeHtml(data.propertyCode)})</div>
    <div class="summary-item"><strong>Agreed Price:</strong> ${escapeHtml(formattedPrice)}</div>
    ${data.signedAt ? `<div class="summary-item"><strong>Signed Date:</strong> ${escapeHtml(new Date(data.signedAt).toLocaleDateString('en-GB'))}</div>` : ''}
  </div>

  <div class="content-body">${escapeHtml(data.content)}</div>

  ${
    data.terms
      ? `
  <div class="terms-box">
    <div class="terms-title">Special Conditions & Terms:</div>
    <div>${escapeHtml(data.terms)}</div>
  </div>`
      : ''
  }

  <div class="signatory-section">
    <div class="sign-box">
      <div class="sign-role">Prepared By</div>
      <div>Sales Executive</div>
    </div>
    <div class="sign-box">
      <div class="sign-role">Verified By</div>
      <div>Accounts & Legal</div>
    </div>
    <div class="sign-box">
      <div class="sign-role">Authorized Signatory</div>
      <div>Managing Director / Director</div>
    </div>
  </div>

  <div class="footer">
    <div>EXZA AUTHENTICATED • IMMUTABLE LEGAL AGREEMENT RECORD</div>
    <div>Page 1 of 1 • Doc: ${escapeHtml(data.agreementNumber)}-V${data.version}</div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
