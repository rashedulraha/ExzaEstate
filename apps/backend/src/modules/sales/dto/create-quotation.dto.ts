import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
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

export class CreateQuotationDto {
  @ApiProperty({
    description: 'Target property unit UUID',
    example: '01919920-d3cf-7e3f-8c3e-f14d8ea0283c',
  })
  @IsUUID('all')
  @IsNotEmpty()
  propertyId!: string;

  @ApiPropertyOptional({
    description: 'Customer UUID (if quoting for an existing customer)',
  })
  @IsUUID('all')
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Lead UUID (if quoting for a CRM lead prior to conversion)',
  })
  @IsUUID('all')
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({
    description: 'Branch UUID',
  })
  @IsUUID('all')
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Quotation validity period in days (default 15 days)',
    default: 15,
  })
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  validDays?: number;

  @ApiPropertyOptional({
    description: 'Explicit validity cutoff timestamp (overrides validDays)',
    example: '2026-04-15T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Explicit base property price in paisa (defaults to property base price)',
    example: '1000000000',
  })
  @IsNumberString()
  @IsOptional()
  basePricePaisa?: string;

  @ApiPropertyOptional({
    description:
      'Explicit premium amount in paisa (floor/corner/view, defaults to property premium)',
    example: '20000000',
  })
  @IsNumberString()
  @IsOptional()
  premiumAmountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Discount percentage (0-100%) applied to base + premium',
    example: 2.5,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPct?: number;

  @ApiPropertyOptional({
    description: 'Explicit discount amount in paisa (overrides discountPct if both provided)',
    example: '25000000',
  })
  @IsNumberString()
  @IsOptional()
  discountAmountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Itemised charges to calculate and attach to quotation',
    type: [ChargeCalculationItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChargeCalculationItemDto)
  @IsOptional()
  charges?: ChargeCalculationItemDto[];

  @ApiPropertyOptional({
    description: 'Payment plan template UUID from catalogue',
  })
  @IsUUID('all')
  @IsOptional()
  paymentPlanTemplateId?: string;

  @ApiPropertyOptional({
    description: 'Proposed initial booking amount in paisa',
    example: '100000000',
  })
  @IsNumberString()
  @IsOptional()
  bookingAmountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Proposed down payment in paisa',
    example: '0',
  })
  @IsNumberString()
  @IsOptional()
  downPaymentPaisa?: string;

  @ApiPropertyOptional({
    description: 'Proposed number of installments (defaults to template count or 24)',
    example: 24,
  })
  @IsInt()
  @Min(1)
  @Max(120)
  @IsOptional()
  installmentCount?: number;

  @ApiPropertyOptional({
    description: 'Payment installment frequency',
    enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'],
  })
  @IsIn(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'])
  @IsOptional()
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';

  @ApiPropertyOptional({
    description: 'First installment due date (YYYY-MM-DD)',
    example: '2026-05-01',
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
