import { ERROR_CODES, Money } from '@exzaestate/shared';
import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CustomMilestoneInput,
  InstallmentFrequency,
} from '../domain/installment-schedule-engine.js';
import type {
  CreatePaymentPlanTemplateDto,
  PreviewScheduleDto,
  UpdatePaymentPlanTemplateDto,
} from '../dto/index.js';

interface RawTemplateRecord {
  id: string;
  companyId: string;
  minBookingPct: { toString(): string } | number;
  downPaymentPct: { toString(): string } | number;
  installmentCount: number;
  frequency: string;
  milestoneConfig: unknown;
}

export interface ResolvedPreviewConfig {
  minBookingPct: number;
  downPaymentPct: number;
  installmentCount: number;
  frequency: InstallmentFrequency;
  customMilestones?: CustomMilestoneInput[];
}

export function resolvePreviewConfig(
  dto: PreviewScheduleDto,
  template?: RawTemplateRecord | null,
): ResolvedPreviewConfig {
  if (dto.templateId && !template) {
    throw new NotFoundException({
      code: ERROR_CODES.NOT_FOUND,
      message: `Payment plan template "${dto.templateId}" not found`,
    });
  }

  let minBookingPct = 10;
  let downPaymentPct = 0;
  let installmentCount = 24;
  let frequency: InstallmentFrequency = 'MONTHLY';
  let customMilestones = dto.customMilestones as CustomMilestoneInput[] | undefined;

  if (template) {
    minBookingPct = Number(template.minBookingPct);
    downPaymentPct = Number(template.downPaymentPct);
    installmentCount = template.installmentCount;
    frequency = template.frequency as InstallmentFrequency;
    if (!customMilestones && template.milestoneConfig) {
      customMilestones = template.milestoneConfig as unknown as CustomMilestoneInput[];
    }
  }

  if (dto.minBookingPct !== undefined) minBookingPct = dto.minBookingPct;
  if (dto.installmentCount !== undefined) installmentCount = dto.installmentCount;
  if (dto.frequency !== undefined) frequency = dto.frequency;

  return { minBookingPct, downPaymentPct, installmentCount, frequency, customMilestones };
}

export function computeScheduleAmounts(
  dto: PreviewScheduleDto,
  netPricePaisa: bigint,
  downPaymentPct: number,
): { bookingAmountPaisa?: bigint; downPaymentPaisa?: bigint } {
  let bookingAmountPaisa: bigint | undefined;
  if (dto.bookingAmountPaisa !== undefined) {
    bookingAmountPaisa = BigInt(dto.bookingAmountPaisa);
  }

  let downPaymentPaisa: bigint | undefined;
  if (dto.downPaymentPaisa !== undefined) {
    downPaymentPaisa = BigInt(dto.downPaymentPaisa);
  } else if (downPaymentPct > 0) {
    downPaymentPaisa = Money.multiplyByRate(netPricePaisa, (downPaymentPct / 100).toString());
  }

  return { bookingAmountPaisa, downPaymentPaisa };
}

const DEFAULT_CREATE_TEMPLATE = {
  description: null,
  planType: 'EQUAL_INSTALLMENTS',
  frequency: 'MONTHLY',
  installmentCount: 24,
  minBookingPct: 10.0,
  downPaymentPct: 0.0,
  milestoneConfig: null,
  isActive: true,
  isDefault: false,
};

export function buildCreateTemplateData(
  companyId: string,
  code: string,
  dto: CreatePaymentPlanTemplateDto,
  userId?: string,
): Prisma.PaymentPlanTemplateCreateInput {
  const raw: Record<string, unknown> = {
    ...DEFAULT_CREATE_TEMPLATE,
    companyId,
    code,
    name: dto.name.trim(),
    createdById: userId || null,
    updatedById: userId || null,
  };

  for (const [key, val] of Object.entries(dto)) {
    if (val !== undefined && key !== 'name' && key !== 'code') {
      raw[key] = val;
    }
  }

  if (dto.milestoneConfig) {
    raw.milestoneConfig = JSON.parse(JSON.stringify(dto.milestoneConfig));
  }
  return raw as unknown as Prisma.PaymentPlanTemplateCreateInput;
}

export function buildUpdateTemplateData(
  dto: UpdatePaymentPlanTemplateDto,
  userId?: string,
): Prisma.PaymentPlanTemplateUpdateInput {
  const data: Record<string, unknown> = {
    updatedById: userId || null,
  };

  for (const [key, val] of Object.entries(dto)) {
    if (val !== undefined) {
      data[key] = val;
    }
  }

  if (dto.name) {
    data.name = dto.name.trim();
  }
  if (dto.description) {
    data.description = dto.description.trim();
  }
  if (dto.milestoneConfig !== undefined) {
    data.milestoneConfig = dto.milestoneConfig
      ? JSON.parse(JSON.stringify(dto.milestoneConfig))
      : null;
  }

  return data as Prisma.PaymentPlanTemplateUpdateInput;
}
