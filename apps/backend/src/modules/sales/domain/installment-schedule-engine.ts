import { BadRequestException } from '@nestjs/common';
import { ERROR_CODES, formatMoney, Money } from '@exzaestate/shared';

export type InstallmentFrequency = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';

export interface CustomMilestoneInput {
  name: string;
  amountPaisa?: string;
  percentage?: number;
  dueDate?: string;
}

export interface BuildScheduleInput {
  netPricePaisa: bigint;
  bookingAmountPaisa?: bigint;
  downPaymentPaisa?: bigint;
  installmentCount?: number;
  firstDueDate: string; // Business date in YYYY-MM-DD
  frequency?: InstallmentFrequency;
  customMilestones?: CustomMilestoneInput[];
  minBookingPct?: number; // e.g. 10 for 10%
}

export interface GeneratedScheduleItem {
  installmentNumber: number;
  name: string;
  type: 'BOOKING_AMOUNT' | 'DOWN_PAYMENT' | 'INSTALLMENT' | 'SPECIAL';
  amountPaisa: bigint;
  amountFormatted: string;
  dueDate: string;
}

export interface GeneratedScheduleResult {
  netPricePaisa: bigint;
  bookingAmountPaisa: bigint;
  downPaymentPaisa: bigint;
  remainingPaisa: bigint;
  installmentCount: number;
  frequency: InstallmentFrequency;
  items: GeneratedScheduleItem[];
  totalScheduledPaisa: bigint;
}

const FREQUENCY_MONTHS_MAP: Record<InstallmentFrequency, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
  CUSTOM: 1,
};

export function addBusinessMonths(baseDateYmd: string, monthsToAdd: number): string {
  if (monthsToAdd === 0) return baseDateYmd;
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

export function validateBookingAmount(
  netPricePaisa: bigint,
  bookingAmountPaisa: bigint,
  minBookingPct = 10,
): void {
  if (bookingAmountPaisa < 0n) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Booking amount cannot be negative',
    });
  }
  if (bookingAmountPaisa > netPricePaisa) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Booking amount cannot exceed net price',
    });
  }
  if (minBookingPct > 0) {
    const requiredMin = Money.multiplyByRate(netPricePaisa, (minBookingPct / 100).toString());
    if (bookingAmountPaisa < requiredMin) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `Booking amount cannot be less than ${minBookingPct}% of net price (${formatMoney(requiredMin)})`,
      });
    }
  }
}

function resolveBookingAndDownPayment(input: BuildScheduleInput): {
  bookingPaisa: bigint;
  downPaymentPaisa: bigint;
  remainingPaisa: bigint;
} {
  const { netPricePaisa, minBookingPct = 10 } = input;
  if (netPricePaisa <= 0n) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Net price must be greater than zero',
    });
  }

  const defaultBooking = Money.multiplyByRate(netPricePaisa, (minBookingPct / 100).toString());
  const bookingPaisa =
    input.bookingAmountPaisa !== undefined ? input.bookingAmountPaisa : defaultBooking;
  validateBookingAmount(netPricePaisa, bookingPaisa, minBookingPct);

  const downPaymentPaisa = input.downPaymentPaisa ?? 0n;
  if (downPaymentPaisa < 0n) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Down payment cannot be negative',
    });
  }

  if (bookingPaisa + downPaymentPaisa > netPricePaisa) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Booking amount plus down payment cannot exceed net price',
    });
  }

  const remainingPaisa = netPricePaisa - bookingPaisa - downPaymentPaisa;
  return { bookingPaisa, downPaymentPaisa, remainingPaisa };
}

function buildCustomMilestoneItems(
  milestones: CustomMilestoneInput[],
  remainingPaisa: bigint,
  firstDueDate: string,
): GeneratedScheduleItem[] {
  if (milestones.length === 0) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Custom milestone plan requires at least one milestone',
    });
  }

  const hasPercentages = milestones.some((m) => m.percentage !== undefined);
  let amounts: bigint[];

  if (hasPercentages) {
    const ratios = milestones.map((m) => {
      const pct = m.percentage ?? 0;
      if (pct <= 0) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Milestone percentage must be greater than zero',
        });
      }
      return BigInt(Math.round(pct * 100));
    });
    amounts = Money.allocate(remainingPaisa, ratios);
  } else {
    amounts = milestones.map((m) => {
      if (!m.amountPaisa) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: `Milestone "${m.name}" must specify either amountPaisa or percentage`,
        });
      }
      return BigInt(m.amountPaisa);
    });
    const sum = amounts.reduce((acc, a) => acc + a, 0n);
    if (sum !== remainingPaisa) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `Sum of custom installment amounts (${formatMoney(sum)}) does not equal remaining balance (${formatMoney(remainingPaisa)})`,
      });
    }
  }

  return milestones.map((m, idx) => ({
    installmentNumber: idx + 1,
    name: m.name.trim(),
    type: 'SPECIAL',
    amountPaisa: amounts[idx]!,
    amountFormatted: formatMoney(amounts[idx]!),
    dueDate: m.dueDate || addBusinessMonths(firstDueDate, idx),
  }));
}

function buildEqualInstallmentItems(
  count: number,
  remainingPaisa: bigint,
  firstDueDate: string,
  frequency: InstallmentFrequency,
): GeneratedScheduleItem[] {
  if (count <= 0) {
    throw new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Installment count must be at least 1',
    });
  }

  if (remainingPaisa === 0n) {
    return [];
  }

  const weights = Array(count).fill(1);
  const allocated = Money.allocate(remainingPaisa, weights);
  const stepMonths = FREQUENCY_MONTHS_MAP[frequency];

  return allocated.map((amount, idx) => {
    const num = (idx + 1).toString().padStart(2, '0');
    return {
      installmentNumber: idx + 1,
      name: `Installment ${num}`,
      type: 'INSTALLMENT',
      amountPaisa: amount,
      amountFormatted: formatMoney(amount),
      dueDate: addBusinessMonths(firstDueDate, idx * stepMonths),
    };
  });
}

export function buildSchedule(input: BuildScheduleInput): GeneratedScheduleResult {
  const { netPricePaisa, firstDueDate, frequency = 'MONTHLY' } = input;
  const { bookingPaisa, downPaymentPaisa, remainingPaisa } = resolveBookingAndDownPayment(input);

  const items: GeneratedScheduleItem[] = [];

  if (bookingPaisa > 0n) {
    items.push({
      installmentNumber: 0,
      name: 'Booking Amount',
      type: 'BOOKING_AMOUNT',
      amountPaisa: bookingPaisa,
      amountFormatted: formatMoney(bookingPaisa),
      dueDate: firstDueDate,
    });
  }

  if (downPaymentPaisa > 0n) {
    items.push({
      installmentNumber: 0,
      name: 'Down Payment',
      type: 'DOWN_PAYMENT',
      amountPaisa: downPaymentPaisa,
      amountFormatted: formatMoney(downPaymentPaisa),
      dueDate: addBusinessMonths(firstDueDate, 1),
    });
  }

  const installmentItems =
    input.customMilestones && input.customMilestones.length > 0
      ? buildCustomMilestoneItems(input.customMilestones, remainingPaisa, firstDueDate)
      : buildEqualInstallmentItems(
          input.installmentCount ?? 24,
          remainingPaisa,
          firstDueDate,
          frequency,
        );

  items.push(...installmentItems);

  const totalScheduledPaisa = items.reduce((acc, it) => acc + it.amountPaisa, 0n);

  return {
    netPricePaisa,
    bookingAmountPaisa: bookingPaisa,
    downPaymentPaisa,
    remainingPaisa,
    installmentCount: installmentItems.length,
    frequency,
    items,
    totalScheduledPaisa,
  };
}
