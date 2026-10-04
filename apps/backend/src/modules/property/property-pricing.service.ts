import { Injectable } from '@nestjs/common';
import { calculatePricingBreakdown, type PropertyPricingItem } from './domain/property-pricing.js';
import type { PricingPreviewDto, PropertyPricingBreakdownDto } from './dto/pricing-preview.dto.js';

@Injectable()
export class PropertyPricingService {
  previewPricing(dto: PricingPreviewDto): PropertyPricingBreakdownDto {
    const basePricePaisa = BigInt(dto.basePricePaisa);
    const premiumPaisa = dto.premiumPaisa ? BigInt(dto.premiumPaisa) : 0n;
    const discountPaisa = dto.discountPaisa ? BigInt(dto.discountPaisa) : undefined;
    const charges: PropertyPricingItem[] = (dto.charges ?? []).map((c) => ({
      code: c.code,
      name: c.name,
      amountPaisa: BigInt(c.amountPaisa),
    }));

    const result = calculatePricingBreakdown({
      basePricePaisa,
      premiumPaisa,
      discountPaisa,
      discountPct: dto.discountPct,
      charges,
      discountLimitPct: dto.discountLimitPct,
    });

    return {
      basePricePaisa: result.basePricePaisa.toString(),
      premiumPaisa: result.premiumPaisa.toString(),
      grossPricePaisa: result.grossPricePaisa.toString(),
      discountPaisa: result.discountPaisa.toString(),
      discountPct: result.discountPct,
      chargesTotalPaisa: result.chargesTotalPaisa.toString(),
      charges: result.charges.map((c) => ({
        code: c.code,
        name: c.name,
        amountPaisa: c.amountPaisa.toString(),
      })),
      netPricePaisa: result.netPricePaisa.toString(),
      discountLimitPct: result.discountLimitPct,
      isWithinDiscountLimit: result.isWithinDiscountLimit,
    };
  }
}
