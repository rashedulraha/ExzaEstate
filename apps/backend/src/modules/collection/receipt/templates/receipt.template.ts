export interface ReceiptTemplateData {
  receiptNumber: string;
  companyName: string;
  customerName: string;
  customerPhone?: string | null;
  projectName: string;
  propertyCode: string;
  amountPaisa: bigint;
  amountFormatted: string;
  amountInWords: string;
  previousDueFormatted: string;
  currentDueFormatted: string;
  paymentMethod: string;
  issuedAt: string;
  watermark?: string | null;
}

export function renderReceiptHtml(data: ReceiptTemplateData, lang: 'en' | 'bn' = 'en'): string {
  const isBn = lang === 'bn';

  const title = isBn ? 'টাকা জমার রসিদ' : 'MONEY RECEIPT';
  const labels = isBn
    ? {
        receiptNo: 'রসিদ নং',
        date: 'তারিখ',
        customerName: 'গ্রাহকের নাম',
        phone: 'মোবাইল',
        project: 'প্রকল্প',
        property: 'প্লট/ইউনিট',
        paymentMethod: 'পরিশোধের মাধ্যম',
        previousDue: 'পূর্ববর্তী বকেয়া',
        paidAmount: 'পরিশোধিত টাকা',
        currentDue: 'বর্তমান বকেয়া',
        inWords: 'কথায়',
        authorizedSign: 'অনুমোদিত স্বাক্ষরকারী',
        customerSign: 'গ্রাহকের স্বাক্ষর',
      }
    : {
        receiptNo: 'Receipt No',
        date: 'Date',
        customerName: 'Customer Name',
        phone: 'Phone',
        project: 'Project',
        property: 'Plot/Unit',
        paymentMethod: 'Payment Method',
        previousDue: 'Previous Due',
        paidAmount: 'Amount Paid',
        currentDue: 'Current Due',
        inWords: 'In Words',
        authorizedSign: 'Authorized Signature',
        customerSign: 'Customer Signature',
      };

  const watermarkHtml = data.watermark
    ? `<div class="watermark">${data.watermark}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${data.receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Kalpurush&family=Inter:wght@400;600;700&display=swap');
    body {
      font-family: 'Kalpurush', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 24px;
      color: #1e293b;
      background-color: #ffffff;
    }
    .receipt-box {
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 32px;
      position: relative;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .company-name {
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .receipt-title {
      font-size: 18px;
      font-weight: 600;
      color: #b45309;
      margin-top: 8px;
      letter-spacing: 1px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .details-table th, .details-table td {
      border: 1px solid #cbd5e1;
      padding: 10px 14px;
      text-align: left;
      font-size: 14px;
    }
    .details-table th {
      background-color: #f8fafc;
      font-weight: 600;
      width: 30%;
    }
    .highlight-amount {
      font-size: 18px;
      font-weight: 700;
      color: #047857;
    }
    .in-words-box {
      background-color: #f1f5f9;
      border: 1px dashed #94a3b8;
      border-radius: 4px;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 32px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      padding-top: 10px;
    }
    .sig-line {
      border-top: 1px solid #64748b;
      width: 200px;
      text-align: center;
      font-size: 13px;
      color: #475569;
      padding-top: 6px;
    }
    .watermark {
      position: absolute;
      top: 40%;
      left: 20%;
      transform: rotate(-30deg);
      font-size: 72px;
      font-weight: 800;
      color: rgba(239, 68, 68, 0.15);
      pointer-events: none;
      z-index: 10;
      text-transform: uppercase;
      letter-spacing: 8px;
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    ${watermarkHtml}
    <div class="header">
      <h1 class="company-name">${data.companyName}</h1>
      <div class="receipt-title">${title}</div>
    </div>

    <div class="meta-row">
      <div><strong>${labels.receiptNo}:</strong> ${data.receiptNumber}</div>
      <div><strong>${labels.date}:</strong> ${data.issuedAt}</div>
    </div>

    <table class="details-table">
      <tr>
        <th>${labels.customerName}</th>
        <td>${data.customerName} ${data.customerPhone ? '(' + data.customerPhone + ')' : ''}</td>
      </tr>
      <tr>
        <th>${labels.project}</th>
        <td>${data.projectName}</td>
      </tr>
      <tr>
        <th>${labels.property}</th>
        <td>${data.propertyCode}</td>
      </tr>
      <tr>
        <th>${labels.paymentMethod}</th>
        <td>${data.paymentMethod}</td>
      </tr>
      <tr>
        <th>${labels.previousDue}</th>
        <td>${data.previousDueFormatted}</td>
      </tr>
      <tr>
        <th>${labels.paidAmount}</th>
        <td class="highlight-amount">${data.amountFormatted}</td>
      </tr>
      <tr>
        <th>${labels.currentDue}</th>
        <td>${data.currentDueFormatted}</td>
      </tr>
    </table>

    <div class="in-words-box">
      ${labels.inWords}: ${data.amountInWords}
    </div>

    <div class="signatures">
      <div class="sig-line">${labels.customerSign}</div>
      <div class="sig-line">${labels.authorizedSign}</div>
    </div>
  </div>
</body>
</html>`;
}
