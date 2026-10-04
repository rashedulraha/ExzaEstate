import type { Prisma } from '@prisma/client';
import type {
  InventoryStatusBreakdown,
  QueryKpiFilterDto,
  ScopeFilterContext,
} from './kpi.types.js';

export function buildScopeWhere(scopeCtx?: ScopeFilterContext): { salesExecutiveId?: string | { in: string[] } } {
  if (!scopeCtx || scopeCtx.scope === 'ALL') {
    return {};
  }
  if (scopeCtx.scope === 'OWN' && scopeCtx.userId) {
    return { salesExecutiveId: scopeCtx.userId };
  }
  if (scopeCtx.scope === 'TEAM' && scopeCtx.teamUserIds && scopeCtx.teamUserIds.length > 0) {
    return { salesExecutiveId: { in: scopeCtx.teamUserIds } };
  }
  return {};
}

export function buildSalesWhere(
  companyId: string,
  filter: QueryKpiFilterDto,
  scopeCtx?: ScopeFilterContext,
  propertyIds?: string[],
): Prisma.BookingWhereInput {
  const scopeWhere = buildScopeWhere(scopeCtx);

  const effectiveStartDate = filter.startDate ? new Date(filter.startDate) : undefined;
  const effectiveEndDate = filter.endDate ? new Date(`${filter.endDate}T23:59:59.999Z`) : undefined;

  const dateFilter =
    effectiveStartDate || effectiveEndDate
      ? {
          confirmedAt: {
            ...(effectiveStartDate ? { gte: effectiveStartDate } : {}),
            ...(effectiveEndDate ? { lte: effectiveEndDate } : {}),
          },
        }
      : {};

  const projectFilter =
    propertyIds !== undefined
      ? { propertyId: { in: propertyIds } }
      : {};

  return {
    companyId,
    deletedAt: null,
    status: { in: ['CONFIRMED', 'AGREEMENT_PENDING', 'AGREEMENT_COMPLETED', 'COMPLETED'] },
    isTransfer: false, // BR-14: excludes transfer successor bookings from sales counts
    ...projectFilter,
    ...(filter.salesExecutiveId ? { salesExecutiveId: filter.salesExecutiveId } : scopeWhere),
    ...dateFilter,
  };
}

export function buildPaymentWhere(
  companyId: string,
  filter: QueryKpiFilterDto,
): Prisma.PaymentWhereInput {
  const effectiveStartDate = filter.startDate ? new Date(filter.startDate) : undefined;
  const effectiveEndDate = filter.endDate ? new Date(`${filter.endDate}T23:59:59.999Z`) : undefined;

  const dateFilter =
    effectiveStartDate || effectiveEndDate
      ? {
          postedAt: {
            ...(effectiveStartDate ? { gte: effectiveStartDate } : {}),
            ...(effectiveEndDate ? { lte: effectiveEndDate } : {}),
          },
        }
      : {};

  return {
    companyId,
    status: 'Posted',
    paymentType: { not: 'REFUND' },
    ...(filter.projectId ? { projectId: filter.projectId } : {}),
    ...dateFilter,
  };
}

export function computeInventoryBreakdown(
  properties: Array<{ status: string; netPricePaisa: bigint }>,
): InventoryStatusBreakdown {
  let availableUnits = 0;
  let bookedUnits = 0;
  let soldUnits = 0;
  let reservedUnits = 0;
  let blockedUnits = 0;
  let totalValue = 0n;
  let availableValue = 0n;

  for (const p of properties) {
    const val = p.netPricePaisa ?? 0n;
    totalValue += val;

    switch (p.status) {
      case 'Available':
        availableUnits++;
        availableValue += val;
        break;
      case 'Booked':
        bookedUnits++;
        break;
      case 'Sold':
        soldUnits++;
        break;
      case 'Reserved':
      case 'Hold':
        reservedUnits++;
        break;
      case 'Blocked':
        blockedUnits++;
        break;
      default:
        break;
    }
  }

  return {
    totalUnits: properties.length,
    availableUnits,
    bookedUnits,
    soldUnits,
    reservedUnits,
    blockedUnits,
    totalInventoryValuePaisa: totalValue.toString(),
    availableInventoryValuePaisa: availableValue.toString(),
  };
}
