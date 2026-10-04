export const QUOTATION_PDF_STYLES = `
  @page {
    size: A4;
    margin: 15mm;
  }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9.5pt;
    color: #0f172a;
    line-height: 1.45;
    margin: 0;
    padding: 0;
    background: #ffffff;
  }
  .header {
    border-bottom: 2px solid #0f172a;
    padding-bottom: 12px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .company-title {
    font-size: 16pt;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .company-sub {
    font-size: 8.5pt;
    color: #475569;
    margin-top: 2px;
  }
  .doc-meta {
    text-align: right;
  }
  .doc-title {
    font-size: 14pt;
    font-weight: 800;
    color: #b45309;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .doc-number {
    font-size: 10pt;
    font-weight: 700;
    color: #0f172a;
    font-family: monospace;
    margin-top: 3px;
  }
  .grid-2 {
    display: table;
    width: 100%;
    margin-bottom: 16px;
  }
  .grid-col {
    display: table-cell;
    width: 50%;
    vertical-align: top;
  }
  .box {
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 10px 12px;
    background: #f8fafc;
    margin-right: 8px;
  }
  .box-title {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 6px;
    letter-spacing: 0.05em;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
  }
  th {
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 8px;
    border-bottom: 2px solid #cbd5e1;
  }
  .grand-total-box {
    background: #0f172a;
    color: #ffffff;
    padding: 12px 16px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }
  .grand-total-label {
    font-size: 10.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .grand-total-value {
    font-size: 16pt;
    font-weight: 800;
    color: #fde68a;
  }
  .notice {
    border-left: 3px solid #f59e0b;
    background: #fffbeb;
    padding: 8px 12px;
    font-size: 8.5pt;
    color: #92400e;
    margin-bottom: 20px;
  }
  .signatures {
    display: table;
    width: 100%;
    margin-top: 40px;
    padding-top: 10px;
  }
  .sig-col {
    display: table-cell;
    width: 33.33%;
    text-align: center;
    vertical-align: bottom;
    padding: 0 10px;
  }
  .sig-line {
    border-top: 1px solid #475569;
    padding-top: 6px;
    font-size: 8.5pt;
    font-weight: 600;
    color: #334155;
  }
  .sig-sub {
    font-size: 7.5pt;
    color: #64748b;
  }
`;
