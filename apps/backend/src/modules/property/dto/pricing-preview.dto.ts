import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PricingChargeItemDto {
  @ApiProperty({ description: 'Charge code (e.g. UTILITY, PARKING)' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: 'Display name for charge' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Charge amount in integer paisa' })
  @IsNumberString()
  @IsNotEmpty()
  amountPaisa!: string;
}

export class PricingPreviewDto {
  @ApiProperty({ description: 'Base price in integer paisa', example: '1000000000' })
  @IsNumberString()
  @IsNotEmpty()
  basePricePaisa!: string;

  @ApiPropertyOptional({ description: 'Premium price in integer paisa', example: '50000000' })
  @IsNumberString()
  @IsOptional()
  premiumPaisa?: string;

  @ApiPropertyOptional({ description: 'Explicit discount in integer paisa' })
  @IsNumberString()
  @IsOptional()
  discountPaisa?: string;

  @ApiPropertyOptional({ description: 'Discount percentage on gross price', example: 5.0 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  discountPct?: number;

  @ApiPropertyOptional({
    description: 'Itemised charges',
    type: [PricingChargeItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingChargeItemDto)
  @IsOptional()
  charges?: PricingChargeItemDto[];

  @ApiPropertyOptional({ description: 'Property discount limit percentage to validate against' })
  @IsOptional()
  discountLimitPct?: number | string;
}

export class PropertyPricingBreakdownDto {
  @ApiProperty({ description: 'Base price in integer paisa' })
  basePricePaisa!: string;

  @ApiProperty({ description: 'Premium price in integer paisa' })
  premiumPaisa!: string;

  @ApiProperty({ description: 'Gross price (base + premium) in integer paisa' })
  grossPricePaisa!: string;

  @ApiProperty({ description: 'Discount amount in integer paisa' })
  discountPaisa!: string;

  @ApiProperty({ description: 'Effective discount percentage' })
  discountPct!: number;

  @ApiProperty({ description: 'Sum of all itemised charges in integer paisa' })
  chargesTotalPaisa!: string;

  @ApiProperty({ description: 'Itemised charges breakdown', type: [PricingChargeItemDto] })
  charges!: PricingChargeItemDto[];

  @ApiProperty({ description: 'Net price (gross - discount + charges) in integer paisa' })
  netPricePaisa!: string;

  @ApiPropertyOptional({ description: 'Configured discount limit percentage' })
  discountLimitPct!: number | null;

  @ApiProperty({ description: 'Whether the requested discount is within approved limit' })
  isWithinDiscountLimit!: boolean;
}
