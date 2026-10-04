import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ChargeCalculationItemDto } from './calculate-charges.dto.js';

export class UpdateQuotationDto {
  @ApiPropertyOptional({
    description: 'Updated validity cutoff timestamp',
    example: '2026-04-30T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Updated discount percentage (0-100%)',
    example: 3.0,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPct?: number;

  @ApiPropertyOptional({
    description: 'Updated explicit discount amount in paisa',
  })
  @IsNumberString()
  @IsOptional()
  discountAmountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Updated itemised charges list',
    type: [ChargeCalculationItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChargeCalculationItemDto)
  @IsOptional()
  charges?: ChargeCalculationItemDto[];

  @ApiPropertyOptional({
    description: 'Updated payment plan template UUID',
  })
  @IsUUID('all')
  @IsOptional()
  paymentPlanTemplateId?: string;

  @ApiPropertyOptional({
    description: 'Updated proposed booking amount in paisa',
  })
  @IsNumberString()
  @IsOptional()
  bookingAmountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Updated proposed down payment in paisa',
  })
  @IsNumberString()
  @IsOptional()
  downPaymentPaisa?: string;

  @ApiPropertyOptional({
    description: 'Updated installment count',
  })
  @IsInt()
  @Min(1)
  @Max(120)
  @IsOptional()
  installmentCount?: number;

  @ApiPropertyOptional({
    description: 'Updated payment installment frequency',
    enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'],
  })
  @IsIn(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'])
  @IsOptional()
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';

  @ApiPropertyOptional({
    description: 'Updated first installment due date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsOptional()
  firstDueDate?: string;

  @ApiPropertyOptional({
    description: 'Special quotation notes for customer',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Custom terms & conditions for this quotation',
  })
  @IsString()
  @IsOptional()
  terms?: string;
}
