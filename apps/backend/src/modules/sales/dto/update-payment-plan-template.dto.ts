import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class UpdatePaymentPlanTemplateDto {
  @ApiPropertyOptional({
    description: 'User-facing template name',
    example: 'Updated 36-Month Plan',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the payment plan terms',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Plan calculation type',
    enum: ['EQUAL_INSTALLMENTS', 'MILESTONE_BASED', 'CUSTOM'],
  })
  @IsIn(['EQUAL_INSTALLMENTS', 'MILESTONE_BASED', 'CUSTOM'])
  @IsOptional()
  planType?: 'EQUAL_INSTALLMENTS' | 'MILESTONE_BASED' | 'CUSTOM';

  @ApiPropertyOptional({
    description: 'Payment recurrence frequency',
    enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'],
  })
  @IsIn(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'])
  @IsOptional()
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';

  @ApiPropertyOptional({
    description: 'Total number of installments',
    example: 36,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(120)
  installmentCount?: number;

  @ApiPropertyOptional({
    description: 'Minimum booking money percentage (e.g. 10 for 10%)',
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  minBookingPct?: number;

  @ApiPropertyOptional({
    description: 'Default down payment percentage (e.g. 10 for 10%)',
    example: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  downPaymentPct?: number;

  @ApiPropertyOptional({
    description: 'Optional milestone configuration array',
  })
  @IsOptional()
  milestoneConfig?: unknown;

  @ApiPropertyOptional({
    description: 'Whether the template is active and selectable',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this template is the company default for new quotations',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
