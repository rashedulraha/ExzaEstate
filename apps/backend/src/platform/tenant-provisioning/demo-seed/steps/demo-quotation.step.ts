import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DemoSeedContext, DemoSeedStep } from '../demo-seed-step.interface.js';

@Injectable()
export class DemoQuotationStep implements DemoSeedStep {
  private readonly logger = new Logger(DemoQuotationStep.name);
  readonly name = 'DemoQuotationStep';
  readonly order = 70;

  async execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void> {
    const existing = await tx.quotation.findFirst({
      where: { companyId: ctx.companyId, deletedAt: null },
    });

    if (existing) {
      this.logger.debug(`Demo quotations already exist for company ${ctx.companyId}`);
      return;
    }

    const [property, customer, paymentPlan, charges] = await Promise.all([
      tx.property.findFirst({
        where: { companyId: ctx.companyId, status: 'Available', deletedAt: null },
      }),
      tx.customer.findFirst({
        where: { companyId: ctx.companyId, deletedAt: null },
      }),
      tx.paymentPlanTemplate.findFirst({
        where: { companyId: ctx.companyId, code: 'STD-36M', deletedAt: null },
      }),
      tx.chargeType.findMany({
        where: { companyId: ctx.companyId, deletedAt: null },
      }),
    ]);

    if (!property || !customer) {
      this.logger.warn(
        `Skipping demo quotation seed: property or customer not found for company ${ctx.companyId}`,
      );
      return;
    }

    const basePricePaisa = property.basePricePaisa > 0n ? property.basePricePaisa : 12_000_000_00n; // ৳1,20,00,000
    const premiumPaisa = property.premiumPaisa > 0n ? property.premiumPaisa : 500_000_00n; // ৳5,00,000
    const netPricePaisa = basePricePaisa + premiumPaisa;

    // Charges snapshot
    const chargesSnapshot = charges.map((c) => {
      const baseAmt =
        c.defaultAmountPaisa ??
        (netPricePaisa * BigInt(Math.round(Number(c.defaultRatePct ?? 0)))) / 100n;
      const vatAmt = (baseAmt * BigInt(Math.round(Number(c.vatRatePct)))) / 100n;
      return {
        name: c.name,
        chargeTypeCode: c.code,
        calculationType: c.calculationType,
        baseAmountPaisa: baseAmt.toString(),
        vatRatePct: Number(c.vatRatePct),
        vatAmountPaisa: vatAmt.toString(),
        totalAmountPaisa: (baseAmt + vatAmt).toString(),
        isIncludedInNetPrice: c.isIncludedInNetPrice,
        payableStage: c.payableStage,
      };
    });

    const totalAdditionalChargesPaisa = chargesSnapshot
      .filter((c) => !c.isIncludedInNetPrice)
      .reduce((acc, c) => acc + BigInt(c.baseAmountPaisa), 0n);

    const totalVatPaisa = chargesSnapshot.reduce((acc, c) => acc + BigInt(c.vatAmountPaisa), 0n);
    const grandTotalPaisa = netPricePaisa + totalAdditionalChargesPaisa + totalVatPaisa;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 15);

    await tx.quotation.create({
      data: {
        companyId: ctx.companyId,
        branchId: ctx.branchId,
        quotationNumber: 'QUO-HO-2026-00001',
        status: 'Sent',
        customerId: customer.id,
        propertyId: property.id,
        paymentPlanTemplateId: paymentPlan?.id ?? null,
        validUntil,
        basePricePaisa,
        premiumAmountPaisa: premiumPaisa,
        discountAmountPaisa: 0n,
        discountPct: 0.0,
        netPricePaisa,
        totalIncludedChargesPaisa: 0n,
        totalAdditionalChargesPaisa,
        totalVatPaisa,
        grandTotalPaisa,
        chargesSnapshot,
        installmentsSnapshot: [],
        requiresApproval: false,
        approvalStatus: null,
        notes: 'Standard residential quotation issued with 15-day price freeze.',
        terms:
          'Payment schedule subject to standard terms. Unit allocation upon booking confirmation.',
      },
    });

    this.logger.log(
      `Demo Quotation seed completed for company ${ctx.companyId} (QUO-HO-2026-00001)`,
    );
  }
}
