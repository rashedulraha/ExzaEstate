import type { CustomerStatementResponseDto } from './dto/statement.dto.js';

export function generateCustomerStatementHtml(
  data: CustomerStatementResponseDto,
  companyName: string = 'ExzaEstate Development Ltd.',
): string {
  const linesHtml = data.lines
    .map(
      (line) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #1E293B;">${line.date}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #1E293B;">${line.reference}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #1E293B;">
          ${line.description}
          <span style="display: block; font-size: 10px; color: #64748B;">Type: ${line.type}</span>
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: right; color: #0F172A; font-weight: 500;">
          ${line.debitPaisa !== '0' ? line.formattedDebit : '-'}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: right; color: #059669; font-weight: 500;">
          ${line.creditPaisa !== '0' ? line.formattedCredit : '-'}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: right; color: #0F172A; font-weight: 600;">
          ${line.formattedRunningBalance}
        </td>
      </tr>
    `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Customer Statement - ${data.customerName}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0F172A;
      background: #FFFFFF;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #0F172A;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 13px;
      color: #64748B;
      margin-top: 4px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 12px;
    }
    .kpi-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      font-weight: 600;
    }
    .kpi-value {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    th {
      background: #0F172A;
      color: #FFFFFF;
      padding: 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #E2E8F0;
      font-size: 11px;
      color: #94A3B8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${companyName}</div>
      <div class="subtitle">Customer Statement of Account</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 600; font-size: 14px;">${data.customerName}</div>
      <div style="font-size: 12px; color: #64748B;">${data.customerPhone ?? ''}</div>
      <div style="font-size: 11px; color: #94A3B8; margin-top: 4px;">
        Period: ${data.fromDate ?? 'Beginning'} to ${data.toDate ?? 'Present'}
      </div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Opening Balance</div>
      <div class="kpi-value">${data.formattedOpeningBalance}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Debits (Billed)</div>
      <div class="kpi-value">${data.formattedTotalDebits}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Credits (Paid)</div>
      <div class="kpi-value" style="color: #059669;">${data.formattedTotalCredits}</div>
    </div>
    <div class="kpi-card" style="border-left: 4px solid #D97706;">
      <div class="kpi-label">Closing Outstanding</div>
      <div class="kpi-value" style="color: #D97706;">${data.formattedClosingOutstanding}</div>
    </div>
  </div>

  ${
    data.customerAdvancePaisa !== '0'
      ? `<div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #065F46; font-weight: 500;">
           Customer Advance Balance Available: <strong>${data.formattedCustomerAdvance}</strong>
         </div>`
      : ''
  }

  <table>
    <thead>
      <tr>
        <th style="text-align: left; width: 12%;">Date</th>
        <th style="text-align: left; width: 18%;">Reference</th>
        <th style="text-align: left; width: 34%;">Description</th>
        <th style="text-align: right; width: 12%;">Debit (Dr)</th>
        <th style="text-align: right; width: 12%;">Credit (Cr)</th>
        <th style="text-align: right; width: 12%;">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${
        linesHtml.length > 0
          ? linesHtml
          : `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #94A3B8; font-size: 13px;">No transactions found for this period.</td></tr>`
      }
    </tbody>
  </table>

  <div class="footer">
    <div>Generated by ExzaEstate Enterprise ERP</div>
    <div>Strict Double-Entry Balanced • Asia/Dhaka Timezone</div>
  </div>
</body>
</html>
  `.trim();
}
