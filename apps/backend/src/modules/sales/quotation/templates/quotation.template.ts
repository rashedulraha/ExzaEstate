export interface QuotationTemplateData {
  quotationNumber: string;
  companyName: string;
  customerName: string;
  customerPhone?: string | null;
  projectName: string;
  propertyCode: string;
  propertyType: string;
  areaSqft: number;
  ratePerSqftFormatted: string;
  totalPriceFormatted: string;
  totalPriceInWords: string;
  bookingAmountFormatted: string;
  downpaymentFormatted: string;
  numberOfInstallments: number;
  installmentAmountFormatted: string;
  validUntil: string;
  issuedAt: string;
}

export function renderQuotationHtml(data: QuotationTemplateData, lang: 'en' | 'bn' = 'en'): string {
  const isBn = lang === 'bn';
  const title = isBn ? 'মূল্য প্রস্তাবনা ও বুকিং বিবরণী' : 'PRICE QUOTATION & PAYMENT PLAN';

  const labels = isBn
    ? {
        quoteNo: 'কোটেশন নং',
        date: 'তারিখ',
        validUntil: 'মেয়াদ উত্তীর্ণের তারিখ',
        customerName: 'গ্রাহকের নাম',
        phone: 'মোবাইল',
        project: 'প্রকল্পের নাম',
        property: 'প্লট/ফ্ল্যাট নম্বর',
        type: 'ধরন',
        area: 'আয়তন (বর্গফুট)',
        rate: 'প্রতি বর্গফুট মূল্য',
        totalPrice: 'সর্বমোট বিক্রয়মূল্য',
        inWords: 'কথায়',
        bookingMoney: 'বুকিং মানি',
        downpayment: 'ডাউনপেমেন্ট',
        installments: 'কিস্তির সংখ্যা',
        monthlyInstallment: 'মাসিক কিস্তির পরিমাণ',
        salesOfficer: 'সেলস অফিসার',
        authorizedSign: 'অনুমোদিত স্বাক্ষর',
      }
    : {
        quoteNo: 'Quotation No',
        date: 'Date',
        validUntil: 'Valid Until',
        customerName: 'Customer Name',
        phone: 'Phone',
        project: 'Project',
        property: 'Plot / Unit',
        type: 'Type',
        area: 'Area (sq ft)',
        rate: 'Rate per sq ft',
        totalPrice: 'Total Agreed Price',
        inWords: 'In Words',
        bookingMoney: 'Booking Money',
        downpayment: 'Down Payment',
        installments: 'Number of Installments',
        monthlyInstallment: 'Monthly Installment',
        salesOfficer: 'Sales Officer',
        authorizedSign: 'Authorized Signature',
      };

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${data.quotationNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Kalpurush&family=Inter:wght@400;600;700&display=swap');
    body {
      font-family: 'Kalpurush', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 24px;
      color: #1e293b;
      background-color: #ffffff;
    }
    .quote-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 32px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .company-name {
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .quote-title {
      font-size: 18px;
      font-weight: 600;
      color: #0284c7;
      margin-top: 6px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #334155;
      margin: 20px 0 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .table th, .table td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      font-size: 13px;
    }
    .table th {
      background-color: #f8fafc;
      text-align: left;
      width: 40%;
      font-weight: 600;
    }
    .highlight {
      font-weight: 700;
      color: #0369a1;
    }
    .in-words {
      background-color: #f0f9ff;
      border: 1px dashed #7dd3fc;
      border-radius: 4px;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
    }
    .sig-line {
      border-top: 1px solid #94a3b8;
      width: 180px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <div class="quote-box">
    <div class="header">
      <h1 class="company-name">${data.companyName}</h1>
      <div class="quote-title">${title}</div>
    </div>

    <div class="meta-row">
      <div><strong>${labels.quoteNo}:</strong> ${data.quotationNumber}</div>
      <div><strong>${labels.date}:</strong> ${data.issuedAt}</div>
      <div><strong>${labels.validUntil}:</strong> ${data.validUntil}</div>
    </div>

    <div class="section-title">${isBn ? 'গ্রাহক ও সম্পত্তির তথ্য' : 'Customer & Property Details'}</div>
    <table class="table">
      <tr><th>${labels.customerName}</th><td>${data.customerName} ${data.customerPhone ? '(' + data.customerPhone + ')' : ''}</td></tr>
      <tr><th>${labels.project}</th><td>${data.projectName}</td></tr>
      <tr><th>${labels.property}</th><td>${data.propertyCode}</td></tr>
      <tr><th>${labels.type}</th><td>${data.propertyType}</td></tr>
      <tr><th>${labels.area}</th><td>${data.areaSqft} sq ft</td></tr>
      <tr><th>${labels.rate}</th><td>${data.ratePerSqftFormatted}</td></tr>
      <tr><th>${labels.totalPrice}</th><td class="highlight">${data.totalPriceFormatted}</td></tr>
    </table>

    <div class="in-words">
      ${labels.inWords}: ${data.totalPriceInWords}
    </div>

    <div class="section-title">${isBn ? 'প্রস্তাবিত পরিশোধের পরিকল্পনা' : 'Proposed Payment Plan'}</div>
    <table class="table">
      <tr><th>${labels.bookingMoney}</th><td>${data.bookingAmountFormatted}</td></tr>
      <tr><th>${labels.downpayment}</th><td>${data.downpaymentFormatted}</td></tr>
      <tr><th>${labels.installments}</th><td>${data.numberOfInstallments}</td></tr>
      <tr><th>${labels.monthlyInstallment}</th><td class="highlight">${data.installmentAmountFormatted}</td></tr>
    </table>

    <div class="signatures">
      <div class="sig-line">${labels.salesOfficer}</div>
      <div class="sig-line">${labels.authorizedSign}</div>
    </div>
  </div>
</body>
</html>`;
}
