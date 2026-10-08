import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CustomMilestoneDto {
  @ApiProperty({ description: 'Milestone name', example: 'Piling Completion' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Exact milestone amount in paisa (integer string)',
    example: '50000000',
  })
  @IsNumberString()
  @IsOptional()
  amountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Milestone percentage of remaining balance (e.g. 20 for 20%)',
    example: 20,
  })
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional({
    description: 'Specific milestone due date in YYYY-MM-DD format',
    example: '2026-06-15',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate must be in YYYY-MM-DD format' })
  dueDate?: string;
}

export class PreviewScheduleDto {
  @ApiProperty({
    description: 'Total net property price in integer paisa (e.g. BDT 50,00,000 = 500000000)',
    example: '500000000',
  })
  @IsNumberString()
  @IsNotEmpty()
  netPricePaisa!: string;

  @ApiPropertyOptional({
    description:
      'Booking amount in paisa. If omitted, defaults to minBookingPct % of netPricePaisa',
    example: '50000000',
  })
  @IsNumberString()
  @IsOptional()
  bookingAmountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Optional down payment in paisa due 1 month after booking',
    example: '50000000',
  })
  @IsNumberString()
  @IsOptional()
  downPaymentPaisa?: string;

  @ApiPropertyOptional({
    description: 'Number of equal installments (1 to 120)',
    example: 24,
    default: 24,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(120)
  installmentCount?: number;

  @ApiProperty({
    description: 'First installment / booking due date in YYYY-MM-DD format',
    example: '2026-03-01',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'firstDueDate must be in YYYY-MM-DD format' })
  firstDueDate!: string;

  @ApiPropertyOptional({
    description: 'Installment frequency',
    enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'],
    default: 'MONTHLY',
  })
  @IsIn(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'])
  @IsOptional()
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';

  @ApiPropertyOptional({
    description:
      'Optional template UUID to load default frequency, installment count and milestone configuration',
  })
  @IsUUID('all')
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Minimum required booking percentage (default 10%)',
    example: 10,
    default: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  minBookingPct?: number;

  @ApiPropertyOptional({
    description: 'Custom milestone items when using custom plan structure',
    type: [CustomMilestoneDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomMilestoneDto)
  customMilestones?: CustomMilestoneDto[];
}
