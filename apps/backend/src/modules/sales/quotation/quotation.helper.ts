import { NotFoundException } from '@nestjs/common';
import { ERROR_CODES, Money } from '@exzaestate/shared';
import type { Property } from '@prisma/client';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { SequenceService } from '../../../platform/sequence/sequence.service.js';
import type { CreateQuotationDto } from '../dto/index.js';
import type { ChargesSnapshotResult } from './quotation-snapshot.helper.js';

export interface CalculatedPricing {
  basePricePaisa: bigint;
  premiumAmountPaisa: bigint;
  discountPct: number;
  discountAmountPaisa: bigint;
  netPricePaisa: bigint;
}

export function calculatePricingBreakdown(params: {
  basePricePaisa: bigint;
  premiumAmountPaisa?: bigint;
  discountPct?: number;
  discountAmountPaisa?: string;
}): CalculatedPricing {
  const base = params.basePricePaisa;
  const premium = params.premiumAmountPaisa ?? 0n;
  const priceBeforeDiscount = base + premium;

  let discountPaisa = 0n;
  let discountPct = 0;

  if (params.discountAmountPaisa !== undefined) {
    discountPaisa = BigInt(params.discountAmountPaisa);
    if (priceBeforeDiscount > 0n) {
      discountPct = Number(
        ((Number(discountPaisa) / Number(priceBeforeDiscount)) * 100).toFixed(2),
      );
    }
  } else if (params.discountPct !== undefined && params.discountPct > 0) {
    discountPct = params.discountPct;
    discountPaisa = Money.multiplyByRate(priceBeforeDiscount, (discountPct / 100).toString());
  }

  const netPricePaisa =
    priceBeforeDiscount > discountPaisa ? priceBeforeDiscount - discountPaisa : 0n;

  return {
    basePricePaisa: base,
    premiumAmountPaisa: premium,
    discountPct,
    discountAmountPaisa: discountPaisa,
    netPricePaisa,
  };
}

export function resolveQuotationPricing(
  property: Property,
  dto: CreateQuotationDto,
): CalculatedPricing {
  const basePricePaisa = dto.basePricePaisa ? BigInt(dto.basePricePaisa) : property.basePricePaisa;
  const premiumAmountPaisa = dto.premiumAmountPaisa
    ? BigInt(dto.premiumAmountPaisa)
    : property.premiumPaisa;

  return calculatePricingBreakdown({
    basePricePaisa,
    premiumAmountPaisa,
    discountPct: dto.discountPct,
    discountAmountPaisa: dto.discountAmountPaisa,
  });
}

export function determineApprovalRequirement(
  discountPct: number,
  freeAllowancePct: number = 0,
): {
  requiresApproval: boolean;
  status: string;
  approvalStatus: string | null;
} {
  if (discountPct > freeAllowancePct) {
    return {
      requiresApproval: true,
      status: 'Pending Approval',
      approvalStatus: 'PENDING',
    };
  }
  return {
    requiresApproval: false,
    status: 'Draft',
    approvalStatus: null,
  };
}

export function calculateValidityDate(validUntil?: string, validDays: number = 15): Date {
  if (validUntil) {
    return new Date(validUntil);
  }
  const date = new Date();
  date.setDate(date.getDate() + validDays);
  return date;
}

export async function generateQuotationNumber(
  tx: TenantPrisma,
  sequenceService: SequenceService,
): Promise<string> {
  const fiscalYear = new Date().getFullYear().toString();
  const seqVal = await sequenceService.next(tx, {
    type: 'QUOTATION',
    fiscalYear,
  });

  return sequenceService.format({
    prefix: 'QUO',
    fiscalYear,
    value: seqVal,
    padding: 5,
  });
}

export function resolvePartySummary(
  customerId?: string | null,
  customerName?: string,
  leadId?: string | null,
  leadName?: string,
): { id: string; type: 'CUSTOMER' | 'LEAD'; name: string } | null {
  if (customerId) {
    return { id: customerId, type: 'CUSTOMER', name: customerName || 'Customer' };
  }
  if (leadId) {
    return { id: leadId, type: 'LEAD', name: leadName || 'Lead' };
  }
  return null;
}

export function buildQuotationsWhere(
  companyId: string,
  query: {
    status?: string;
    propertyId?: string;
    customerId?: string;
    leadId?: string;
    search?: string;
  },
): Record<string, unknown> {
  const where: Record<string, unknown> = {
    companyId,
    deletedAt: null,
  };

  if (query.status) where.status = query.status;
  if (query.propertyId) where.propertyId = query.propertyId;
  if (query.customerId) where.customerId = query.customerId;
  if (query.leadId) where.leadId = query.leadId;
  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { quotationNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

export interface BuildQuotationCreateDataParams {
  companyId: string;
  quotationNumber: string;
  status: string;
  approval: { requiresApproval: boolean; approvalStatus: string | null };
  validUntil: Date;
  pricing: CalculatedPricing;
  chargesRes: ChargesSnapshotResult;
  installmentsSnapshot: unknown[];
  dto: CreateQuotationDto;
  userId?: string;
}

export function buildQuotationCreateData(params: BuildQuotationCreateDataParams) {
  const {
    companyId,
    quotationNumber,
    status,
    approval,
    validUntil,
    pricing,
    chargesRes,
    installmentsSnapshot,
    dto,
    userId,
  } = params;

  return {
    companyId,
    branchId: dto.branchId ?? null,
    quotationNumber,
    status,
    customerId: dto.customerId ?? null,
    leadId: dto.leadId ?? null,
    propertyId: dto.propertyId,
    paymentPlanTemplateId: dto.paymentPlanTemplateId ?? null,
    validUntil,
    basePricePaisa: pricing.basePricePaisa,
    premiumAmountPaisa: pricing.premiumAmountPaisa,
    discountAmountPaisa: pricing.discountAmountPaisa,
    discountPct: pricing.discountPct,
    netPricePaisa: pricing.netPricePaisa,
    totalIncludedChargesPaisa: chargesRes.totalIncludedPaisa,
    totalAdditionalChargesPaisa: chargesRes.totalAdditionalPaisa,
    totalVatPaisa: chargesRes.totalVatPaisa,
    grandTotalPaisa: chargesRes.grandTotalPaisa,
    chargesSnapshot: JSON.parse(JSON.stringify(chargesRes.chargesSnapshot)),
    installmentsSnapshot: JSON.parse(JSON.stringify(installmentsSnapshot)),
    requiresApproval: approval.requiresApproval,
    approvalStatus: approval.approvalStatus,
    notes: dto.notes ? dto.notes.trim() : null,
    terms: dto.terms ? dto.terms.trim() : null,
    createdById: userId ?? null,
    updatedById: userId ?? null,
  };
}

export async function validateCustomerAndLead(
  tx: TenantPrisma,
  companyId: string,
  customerId?: string,
  leadId?: string,
): Promise<{ customerName?: string; leadName?: string }> {
  let customerName: string | undefined;
  let leadName: string | undefined;

  if (customerId) {
    const customer = await tx.customer.findFirst({
      where: { id: customerId, companyId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: `Customer "${customerId}" not found`,
      });
    }
    customerName = customer.name;
  }

  if (leadId) {
    const lead = await tx.lead.findFirst({
      where: { id: leadId, companyId, deletedAt: null },
    });
    if (!lead) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: `Lead "${leadId}" not found`,
      });
    }
    leadName = lead.name;
  }

  return { customerName, leadName };
}
