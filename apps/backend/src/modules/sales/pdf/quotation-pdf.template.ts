import { formatMoney } from '@exzaestate/shared';
import { QUOTATION_PDF_STYLES } from './quotation-pdf.styles.js';

export interface QuotationPdfData {
  company: {
    name: string;
    branchName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  quotation: {
    quotationNumber: string;
    quotationDate: string;
    validUntil: string;
    status: string;
    notes?: string | null;
    terms?: string | null;
  };
  client: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  property: {
    code: string;
    title?: string | null;
    type: string;
    areaSqft: number;
    facing?: string | null;
    projectName?: string | null;
    blockName?: string | null;
    floorName?: string | null;
  };
  pricing: {
    basePricePaisa: bigint;
    premiumAmountPaisa: bigint;
    discountPct: number;
    discountAmountPaisa: bigint;
    netPricePaisa: bigint;
    totalIncludedChargesPaisa: bigint;
    totalAdditionalChargesPaisa: bigint;
    totalVatPaisa: bigint;
    grandTotalPaisa: bigint;
  };
  charges: Array<{
    name: string;
    chargeTypeCode?: string;
    baseAmountPaisa: bigint;
    vatRatePct: number;
    vatAmountPaisa: bigint;
    totalAmountPaisa: bigint;
    isIncludedInNetPrice: boolean;
    payableStage: string;
  }>;
  installments: Array<{
    sequence: number;
    name: string;
    type: string;
    dueDate: string;
    amountPaisa: bigint;
  }>;
}

function renderHeader(data: QuotationPdfData): string {
  const branch = data.company.branchName || 'Head Office';
  const phone = data.company.phone || '+8801700000000';
  const email = data.company.email || 'sales@exzaestate.com';

  return `
  <div class="header">
    <div>
      <div class="company-title">${data.company.name}</div>
      <div class="company-sub">${branch} • Phone: ${phone}</div>
      <div class="company-sub">${email}</div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">Sale Quotation</div>
      <div class="doc-number">${data.quotation.quotationNumber}</div>
      <div style="font-size: 8.5pt; color: #64748b; margin-top: 4px;">
        Issue Date: <strong>${data.quotation.quotationDate}</strong><br>
        Valid Until: <strong>${data.quotation.validUntil}</strong>
      </div>
    </div>
  </div>`;
}

function renderClientAndProperty(data: QuotationPdfData): string {
  const proj = data.property.projectName || 'Project';
  const loc = `${data.property.blockName || 'Tower'} / ${data.property.floorName || 'Floor'}`;

  return `
  <div class="grid-2">
    <div class="grid-col">
      <div class="box">
        <div class="box-title">Client / Buyer Details</div>
        <div style="font-size: 10.5pt; font-weight: 700; color: #0f172a;">${data.client.name}</div>
        <div style="font-size: 9pt; color: #475569; margin-top: 3px;">Phone: ${data.client.phone || 'N/A'}</div>
        <div style="font-size: 9pt; color: #475569;">Email: ${data.client.email || 'N/A'}</div>
        <div style="font-size: 9pt; color: #475569;">Address: ${data.client.address || 'Dhaka, Bangladesh'}</div>
      </div>
    </div>
    <div class="grid-col">
      <div class="box" style="margin-right: 0; margin-left: 8px;">
        <div class="box-title">Property Specification</div>
        <div style="font-size: 10.5pt; font-weight: 700; color: #0f172a;">${proj}, Unit ${data.property.code}</div>
        <div style="font-size: 9pt; color: #475569; margin-top: 3px;">Type: ${data.property.type} • Area: ${data.property.areaSqft} sq.ft</div>
        <div style="font-size: 9pt; color: #475569;">Location: ${loc}</div>
        <div style="font-size: 9pt; color: #475569;">Facing: ${data.property.facing || 'Standard'}</div>
      </div>
    </div>
  </div>`;
}

function renderPricingTable(data: QuotationPdfData): string {
  const p = data.pricing;
  return `
  <div style="font-size: 10pt; font-weight: 700; text-transform: uppercase; color: #0f172a; margin-bottom: 8px; letter-spacing: 0.05em;">
    1. Property Net Price Structure
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Item Description</th>
        <th style="text-align: center;">Rate / %</th>
        <th style="text-align: right;">Amount (BDT)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Base Property Value (${data.property.areaSqft} sq.ft)</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">Standard</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatMoney(p.basePricePaisa)}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Floor & Location Premium</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">Prime</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatMoney(p.premiumAmountPaisa)}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #dc2626;">Special Discount Applied</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #dc2626;">${p.discountPct > 0 ? `${p.discountPct}%` : '0%'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #dc2626; font-weight: 600;">- ${formatMoney(p.discountAmountPaisa)}</td>
      </tr>
      <tr style="background: #f8fafc; font-weight: 700;">
        <td colspan="2" style="padding: 10px; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; font-size: 10pt;">NET PROPERTY PRICE (মূল সম্পত্তি মূল্য)</td>
        <td style="padding: 10px; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; text-align: right; font-size: 10.5pt; color: #0f172a;">${formatMoney(p.netPricePaisa)}</td>
      </tr>
    </tbody>
  </table>`;
}

function renderChargesRows(charges: QuotationPdfData['charges']): string {
  if (!charges || charges.length === 0) {
    return '<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 10px;">No additional charges</td></tr>';
  }

  return charges
    .map((c) => {
      const stage = c.payableStage.replace('_', ' ');
      const incBadge = c.isIncludedInNetPrice
        ? '<span style="font-size: 8pt; color: #166534; background: #dcfce7; padding: 2px 6px; border-radius: 4px;">Included</span>'
        : '<span style="font-size: 8pt; color: #1e40af; background: #dbeafe; padding: 2px 6px; border-radius: 4px;">Additional</span>';
      const vatText =
        c.vatRatePct > 0 ? `${c.vatRatePct}% (${formatMoney(c.vatAmountPaisa)})` : '0%';

      return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${c.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${stage} ${incBadge}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatMoney(c.baseAmountPaisa)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${vatText}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${formatMoney(c.totalAmountPaisa)}</td>
      </tr>`;
    })
    .join('');
}

function renderInstallmentsRows(installments: QuotationPdfData['installments']): string {
  if (!installments || installments.length === 0) {
    return '<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 10px;">Full payment upon agreement</td></tr>';
  }

  return installments
    .map(
      (inst) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">#${inst.sequence}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${inst.name}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${inst.dueDate}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${formatMoney(inst.amountPaisa)}</td>
      </tr>`,
    )
    .join('');
}

function renderSignatures(): string {
  return `
  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line">Prepared By</div>
      <div class="sig-sub">Sales Executive</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">Verified By</div>
      <div class="sig-sub">Accounts / General Manager</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">Customer Acceptance</div>
      <div class="sig-sub">Signature & Date</div>
    </div>
  </div>`;
}

export function generateQuotationHtml(data: QuotationPdfData): string {
  const chargesRows = renderChargesRows(data.charges);
  const installmentsRows = renderInstallmentsRows(data.installments);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation ${data.quotation.quotationNumber}</title>
  <style>${QUOTATION_PDF_STYLES}</style>
</head>
<body>
  ${renderHeader(data)}
  ${renderClientAndProperty(data)}
  ${renderPricingTable(data)}

  <div style="font-size: 10pt; font-weight: 700; text-transform: uppercase; color: #0f172a; margin-bottom: 8px; letter-spacing: 0.05em;">
    2. Itemised Charges, Connection Fees & Taxes
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Charge Description</th>
        <th style="text-align: center;">Payable Stage</th>
        <th style="text-align: right;">Base Fee</th>
        <th style="text-align: right;">VAT / Tax</th>
        <th style="text-align: right;">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      ${chargesRows}
    </tbody>
  </table>

  <div class="grand-total-box">
    <div>
      <div class="grand-total-label">Grand Total Payable (সর্বমোট পরিশোধযোগ্য)</div>
      <div style="font-size: 8pt; color: #94a3b8; margin-top: 2px;">Net Property Price + Additional Charges + Statutory VAT</div>
    </div>
    <div class="grand-total-value">${formatMoney(data.pricing.grandTotalPaisa)}</div>
  </div>

  <div style="font-size: 10pt; font-weight: 700; text-transform: uppercase; color: #0f172a; margin-bottom: 8px; letter-spacing: 0.05em;">
    3. Proposed Payment Installment Schedule
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align: center; width: 50px;">#</th>
        <th style="text-align: left;">Installment Name / Stage</th>
        <th style="text-align: center; width: 120px;">Due Date</th>
        <th style="text-align: right; width: 140px;">Amount (BDT)</th>
      </tr>
    </thead>
    <tbody>
      ${installmentsRows}
    </tbody>
  </table>

  <div class="notice">
    <strong>Notice & Validity Terms:</strong> This quotation is valid until <strong>${data.quotation.validUntil}</strong>. A quotation is a draft commercial proposal and <u>does not</u> constitute a reservation or hold on the property. Unit availability is confirmed strictly upon booking execution and receipt of the booking money.
  </div>

  ${renderSignatures()}
</body>
</html>`;
}
