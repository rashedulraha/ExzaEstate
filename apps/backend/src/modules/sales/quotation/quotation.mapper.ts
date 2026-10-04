import { formatMoney } from '@exzaestate/shared';
import type { QuotationResponseDto } from '../dto/index.js';

interface RawQuotationRecord {
  id: string;
  companyId: string;
  branchId: string | null;
  quotationNumber: string;
  status: string;
  customerId: string | null;
  leadId: string | null;
  propertyId: string;
  paymentPlanTemplateId: string | null;
  quotationDate: Date;
  validUntil: Date;
  basePricePaisa: bigint;
  premiumAmountPaisa: bigint;
  discountAmountPaisa: bigint;
  discountPct: { toString(): string } | number;
  netPricePaisa: bigint;
  totalIncludedChargesPaisa: bigint;
  totalAdditionalChargesPaisa: bigint;
  totalVatPaisa: bigint;
  grandTotalPaisa: bigint;
  chargesSnapshot: unknown;
  installmentsSnapshot: unknown;
  pricingSnapshot: unknown;
  requiresApproval: boolean;
  approvalStatus: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  convertedAt: Date | null;
  bookingId: string | null;
  notes: string | null;
  terms: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationAssociatedData {
  property?: {
    id: string;
    code: string;
    title?: string | null;
    type: string;
    areaSqft: number;
    facing?: string | null;
    projectName?: string | null;
    blockName?: string | null;
    floorName?: string | null;
  };
  party?: {
    id: string;
    type: 'CUSTOMER' | 'LEAD';
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export function mapQuotationToDto(
  record: RawQuotationRecord,
  assoc?: QuotationAssociatedData,
): QuotationResponseDto {
  const isExpired = new Date(record.validUntil).getTime() < Date.now();

  const property = assoc?.property ?? {
    id: record.propertyId,
    code: 'UNKNOWN',
    type: 'FLAT',
    areaSqft: 0,
  };

  return {
    id: record.id,
    companyId: record.companyId,
    branchId: record.branchId,
    quotationNumber: record.quotationNumber,
    status: record.status,
    quotationDate: record.quotationDate.toISOString(),
    validUntil: record.validUntil.toISOString(),
    isExpired,
    property,
    party: assoc?.party ?? null,
    basePricePaisa: record.basePricePaisa.toString(),
    basePriceFormatted: formatMoney(record.basePricePaisa),
    premiumAmountPaisa: record.premiumAmountPaisa.toString(),
    premiumAmountFormatted: formatMoney(record.premiumAmountPaisa),
    discountAmountPaisa: record.discountAmountPaisa.toString(),
    discountAmountFormatted: formatMoney(record.discountAmountPaisa),
    discountPct: Number(record.discountPct),
    netPricePaisa: record.netPricePaisa.toString(),
    netPriceFormatted: formatMoney(record.netPricePaisa),
    totalIncludedChargesPaisa: record.totalIncludedChargesPaisa.toString(),
    totalIncludedChargesFormatted: formatMoney(record.totalIncludedChargesPaisa),
    totalAdditionalChargesPaisa: record.totalAdditionalChargesPaisa.toString(),
    totalAdditionalChargesFormatted: formatMoney(record.totalAdditionalChargesPaisa),
    totalVatPaisa: record.totalVatPaisa.toString(),
    totalVatFormatted: formatMoney(record.totalVatPaisa),
    grandTotalPaisa: record.grandTotalPaisa.toString(),
    grandTotalFormatted: formatMoney(record.grandTotalPaisa),
    chargesSnapshot: Array.isArray(record.chargesSnapshot) ? record.chargesSnapshot : [],
    installmentsSnapshot: Array.isArray(record.installmentsSnapshot)
      ? record.installmentsSnapshot
      : [],
    requiresApproval: record.requiresApproval,
    approvalStatus: record.approvalStatus,
    approvedById: record.approvedById,
    approvedAt: record.approvedAt ? record.approvedAt.toISOString() : null,
    rejectionReason: record.rejectionReason,
    convertedAt: record.convertedAt ? record.convertedAt.toISOString() : null,
    bookingId: record.bookingId,
    notes: record.notes,
    terms: record.terms,
    createdById: record.createdById,
    updatedById: record.updatedById,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
