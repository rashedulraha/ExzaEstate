import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import {
  calculateItemisedCharges,
  type ChargeItemInput,
} from '../domain/charge-calculation-engine.js';
import { buildSchedule, type InstallmentFrequency } from '../domain/installment-schedule-engine.js';
import { resolveChargeItemInput } from '../charges/charge.helper.js';
import type { ChargeCalculationItemDto } from '../dto/index.js';

export interface ChargesSnapshotResult {
  chargesSnapshot: unknown[];
  totalIncludedPaisa: bigint;
  totalAdditionalPaisa: bigint;
  totalVatPaisa: bigint;
  grandTotalPaisa: bigint;
}

export async function resolveChargesSnapshot(
  tx: TenantPrisma,
  companyId: string,
  netPricePaisa: bigint,
  chargesDto?: ChargeCalculationItemDto[],
): Promise<ChargesSnapshotResult> {
  if (!chargesDto || chargesDto.length === 0) {
    return {
      chargesSnapshot: [],
      totalIncludedPaisa: 0n,
      totalAdditionalPaisa: 0n,
      totalVatPaisa: 0n,
      grandTotalPaisa: netPricePaisa,
    };
  }

  const typeIds = chargesDto.map((c) => c.chargeTypeId).filter((id): id is string => Boolean(id));

  const chargeTypes =
    typeIds.length > 0
      ? await tx.chargeType.findMany({
          where: { id: { in: typeIds }, companyId, deletedAt: null },
        })
      : [];

  const typeMap = new Map(chargeTypes.map((ct) => [ct.id, ct]));
  const resolvedInputs: ChargeItemInput[] = chargesDto.map((it) =>
    resolveChargeItemInput(it, it.chargeTypeId ? typeMap.get(it.chargeTypeId) : null),
  );

  const summary = calculateItemisedCharges(netPricePaisa, resolvedInputs);
  const chargesSnapshot = summary.items.map((it) => ({
    name: it.name,
    chargeTypeCode: it.chargeTypeCode,
    calculationType: it.calculationType,
    baseAmountPaisa: it.baseAmountPaisa.toString(),
    vatRatePct: it.vatRatePct,
    vatAmountPaisa: it.vatAmountPaisa.toString(),
    totalAmountPaisa: it.totalAmountPaisa.toString(),
    isIncludedInNetPrice: it.isIncludedInNetPrice,
    payableStage: it.payableStage,
  }));

  return {
    chargesSnapshot,
    totalIncludedPaisa: summary.totalIncludedChargesPaisa,
    totalAdditionalPaisa: summary.totalAdditionalChargesPaisa,
    totalVatPaisa: summary.totalVatPaisa,
    grandTotalPaisa: summary.grandTotalPaisa,
  };
}

async function resolveInstallmentPlanConfig(
  tx: TenantPrisma,
  companyId: string,
  netPricePaisa: bigint,
  templateId?: string,
  customCount?: number,
  bookingAmountPaisa?: string,
): Promise<{ count: number; bookingAmt?: bigint }> {
  let count = customCount ?? 24;
  let bookingAmt = bookingAmountPaisa ? BigInt(bookingAmountPaisa) : undefined;

  if (templateId) {
    const tmpl = await tx.paymentPlanTemplate.findFirst({
      where: { id: templateId, companyId, deletedAt: null },
    });
    if (tmpl) {
      count = customCount ?? tmpl.installmentCount;
      if (!bookingAmountPaisa && Number(tmpl.minBookingPct) > 0) {
        const pct = BigInt(Math.round(Number(tmpl.minBookingPct)));
        bookingAmt = (netPricePaisa * pct) / 100n;
      }
    }
  }

  return { count, bookingAmt };
}

export async function resolveInstallmentsSnapshot(
  tx: TenantPrisma,
  companyId: string,
  netPricePaisa: bigint,
  templateId?: string,
  customCount?: number,
  bookingAmountPaisa?: string,
  firstDueDate?: string,
  frequency?: InstallmentFrequency,
): Promise<unknown[]> {
  if (!templateId && !customCount) {
    return [];
  }

  const { count, bookingAmt } = await resolveInstallmentPlanConfig(
    tx,
    companyId,
    netPricePaisa,
    templateId,
    customCount,
    bookingAmountPaisa,
  );

  const dueDateStr = firstDueDate
    ? firstDueDate.slice(0, 10)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const schedule = buildSchedule({
    netPricePaisa,
    bookingAmountPaisa: bookingAmt,
    installmentCount: count,
    firstDueDate: dueDateStr,
    frequency: frequency ?? 'MONTHLY',
  });

  return schedule.items.map((inst) => ({
    sequence: inst.installmentNumber,
    name: inst.name,
    type: inst.type,
    dueDate: inst.dueDate,
    amountPaisa: inst.amountPaisa.toString(),
  }));
}
