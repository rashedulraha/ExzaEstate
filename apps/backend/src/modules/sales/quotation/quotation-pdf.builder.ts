import type { Company, Customer, Lead, Property, Quotation } from '@prisma/client';
import type { QuotationPdfData } from '../pdf/quotation-pdf.template.js';

function extractCompanyInfo(company?: Company | null) {
  return {
    name: company?.name || 'ExzaEstate Real Estate',
    email: 'sales@exzaestate.com',
    phone: '+8801700000000',
  };
}

function extractQuotationMeta(q: Quotation) {
  return {
    quotationNumber: q.quotationNumber,
    quotationDate: q.quotationDate.toISOString().slice(0, 10),
    validUntil: q.validUntil.toISOString().slice(0, 10),
    status: q.status,
    notes: q.notes,
    terms: q.terms,
  };
}

function extractClientInfo(customer?: Customer | null, lead?: Lead | null) {
  if (customer) {
    return {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    };
  }
  if (lead) {
    return {
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
    };
  }
  return {
    name: 'Valued Client',
    phone: null,
    email: null,
  };
}

function extractPropertyInfo(property?: Property | null) {
  return {
    code: property?.code || 'UNIT-001',
    title: property?.title,
    type: property?.type || 'FLAT',
    areaSqft: property ? Number(property.areaSqft) : 0,
    facing: property?.facing,
  };
}

function extractPricingInfo(q: Quotation) {
  return {
    basePricePaisa: q.basePricePaisa,
    premiumAmountPaisa: q.premiumAmountPaisa,
    discountPct: Number(q.discountPct),
    discountAmountPaisa: q.discountAmountPaisa,
    netPricePaisa: q.netPricePaisa,
    totalIncludedChargesPaisa: q.totalIncludedChargesPaisa,
    totalAdditionalChargesPaisa: q.totalAdditionalChargesPaisa,
    totalVatPaisa: q.totalVatPaisa,
    grandTotalPaisa: q.grandTotalPaisa,
  };
}

function extractChargesSnapshot(chargesSnapshot: unknown) {
  if (!Array.isArray(chargesSnapshot)) {
    return [];
  }
  return (chargesSnapshot as Array<Record<string, unknown>>).map((c) => ({
    name: String(c.name || 'Charge'),
    chargeTypeCode: c.chargeTypeCode ? String(c.chargeTypeCode) : undefined,
    baseAmountPaisa: BigInt(String(c.baseAmountPaisa || 0)),
    vatRatePct: Number(c.vatRatePct || 0),
    vatAmountPaisa: BigInt(String(c.vatAmountPaisa || 0)),
    totalAmountPaisa: BigInt(String(c.totalAmountPaisa || 0)),
    isIncludedInNetPrice: Boolean(c.isIncludedInNetPrice),
    payableStage: String(c.payableStage || 'AT_BOOKING'),
  }));
}

function extractInstallmentsSnapshot(installmentsSnapshot: unknown) {
  if (!Array.isArray(installmentsSnapshot)) {
    return [];
  }
  return (installmentsSnapshot as Array<Record<string, unknown>>).map((inst) => ({
    sequence: Number(inst.sequence || 1),
    name: String(inst.name || 'Installment'),
    type: String(inst.type || 'INSTALLMENT'),
    dueDate: String(inst.dueDate || ''),
    amountPaisa: BigInt(String(inst.amountPaisa || 0)),
  }));
}

export function buildQuotationPdfData(params: {
  quotation: Quotation;
  company?: Company | null;
  property?: Property | null;
  customer?: Customer | null;
  lead?: Lead | null;
}): QuotationPdfData {
  const { quotation: q, company, property, customer, lead } = params;

  return {
    company: extractCompanyInfo(company),
    quotation: extractQuotationMeta(q),
    client: extractClientInfo(customer, lead),
    property: extractPropertyInfo(property),
    pricing: extractPricingInfo(q),
    charges: extractChargesSnapshot(q.chargesSnapshot),
    installments: extractInstallmentsSnapshot(q.installmentsSnapshot),
  };
}
