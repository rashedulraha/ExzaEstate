import { formatMoney, Money } from '@exzaestate/shared';

export type InstallmentFrequency = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';

export interface MilestoneScheduleItemInput {
  name: string;
  amountPaisa?: string;
  percentage?: number;
  dueDate?: string;
  milestoneEvent?: string;
}

export interface GenerateScheduleParams {
  netPricePaisa: bigint;
  bookingAmountPaisa?: bigint;
  downPaymentPaisa?: bigint;
  installmentCount?: number;
  firstDueDate: string; // YYYY-MM-DD
  frequency?: InstallmentFrequency;
  customMilestones?: MilestoneScheduleItemInput[];
}

export interface ScheduledInstallmentItem {
  installmentNumber: number;
  name: string;
  type: string;
  dueDate: string; // YYYY-MM-DD
  amountPaisa: bigint;
  amountFormatted: string;
  milestoneEvent?: string;
}

const FREQUENCY_INTERVAL_MAP: Record<InstallmentFrequency, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
  CUSTOM: 1,
};

export function addBusinessMonthsToDate(baseDateYmd: string, monthsToAdd: number): string {
  if (monthsToAdd === 0) {
    return baseDateYmd;
  }
  const [yearStr = '2026', monthStr = '01', dayStr = '01'] = baseDateYmd.split('-');
  const baseYear = parseInt(yearStr, 10);
  const baseMonth = parseInt(monthStr, 10);
  const baseDay = parseInt(dayStr, 10);

  const totalMonths = baseMonth - 1 + monthsToAdd;
  const targetYear = baseYear + Math.floor(totalMonths / 12);
  const targetMonth = (((totalMonths % 12) + 12) % 12) + 1;

  const daysInMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(baseDay, daysInMonth);

  const yStr = targetYear.toString().padStart(4, '0');
  const mStr = targetMonth.toString().padStart(2, '0');
  const dStr = targetDay.toString().padStart(2, '0');

  return `${yStr}-${mStr}-${dStr}`;
}

function resolveMilestoneAmounts(
  customMilestones: MilestoneScheduleItemInput[],
  remainingPaisa: bigint,
): bigint[] {
  const hasPercentages = customMilestones.some((m) => m.percentage !== undefined);
  if (hasPercentages) {
    const ratios = customMilestones.map((m) => {
      const pct = m.percentage ?? 0;
      return BigInt(Math.round(pct * 100));
    });
    return Money.allocate(remainingPaisa, ratios);
  }
  return customMilestones.map((m) => BigInt(m.amountPaisa ?? '0'));
}

function buildMilestoneItems(
  customMilestones: MilestoneScheduleItemInput[],
  remainingPaisa: bigint,
  firstDueDate: string,
): ScheduledInstallmentItem[] {
  const amounts = resolveMilestoneAmounts(customMilestones, remainingPaisa);
  const items: ScheduledInstallmentItem[] = [];

  for (let i = 0; i < customMilestones.length; i++) {
    const m = customMilestones[i]!;
    const amount = amounts[i]!;
    const dueDate = m.dueDate || addBusinessMonthsToDate(firstDueDate, i);
    items.push({
      installmentNumber: i + 1,
      name: m.name.trim() || `Milestone ${i + 1}`,
      type: m.milestoneEvent ? 'MILESTONE' : 'SPECIAL',
      dueDate,
      amountPaisa: amount,
      amountFormatted: formatMoney(amount),
      milestoneEvent: m.milestoneEvent,
    });
  }

  return items;
}

function buildEqualInstallmentItems(
  count: number,
  remainingPaisa: bigint,
  firstDueDate: string,
  frequency: InstallmentFrequency,
): ScheduledInstallmentItem[] {
  if (count <= 0 || remainingPaisa === 0n) {
    return [];
  }

  const ratios = Array.from({ length: count }, () => 1n);
  const allocatedAmounts = Money.allocate(remainingPaisa, ratios);
  const stepMonths = FREQUENCY_INTERVAL_MAP[frequency] ?? 1;
  const items: ScheduledInstallmentItem[] = [];

  for (let i = 0; i < count; i++) {
    const amount = allocatedAmounts[i]!;
    const dueDate = addBusinessMonthsToDate(firstDueDate, i * stepMonths);
    items.push({
      installmentNumber: i + 1,
      name: `Installment ${i + 1}`,
      type: 'REGULAR',
      dueDate,
      amountPaisa: amount,
      amountFormatted: formatMoney(amount),
    });
  }

  return items;
}

export function generateInstallmentItems(
  params: GenerateScheduleParams,
): ScheduledInstallmentItem[] {
  const {
    netPricePaisa,
    bookingAmountPaisa = 0n,
    downPaymentPaisa = 0n,
    installmentCount = 24,
    firstDueDate,
    frequency = 'MONTHLY',
    customMilestones,
  } = params;

  if (netPricePaisa <= 0n) {
    throw new Error('Net price must be greater than zero');
  }

  const upfrontPaisa = bookingAmountPaisa + downPaymentPaisa;
  if (upfrontPaisa > netPricePaisa) {
    throw new Error('Booking amount plus down payment cannot exceed net price');
  }

  const remainingPaisa = netPricePaisa - upfrontPaisa;

  if (customMilestones && customMilestones.length > 0) {
    return buildMilestoneItems(customMilestones, remainingPaisa, firstDueDate);
  }

  return buildEqualInstallmentItems(installmentCount, remainingPaisa, firstDueDate, frequency);
}
