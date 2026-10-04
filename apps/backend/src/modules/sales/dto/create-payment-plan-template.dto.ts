import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePaymentPlanTemplateDto {
  @ApiProperty({
    description: 'Unique template identifier code within the company',
    example: 'STD-36M',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code must only contain uppercase letters, numbers, underscores and hyphens',
  })
  code!: string;

  @ApiProperty({
    description: 'User-facing template name',
    example: 'Standard 36-Month Equal Installment Plan',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the payment plan terms',
    example:
      'Requires 10% booking money and divides remaining 90% equally over 36 monthly installments.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Plan calculation type',
    enum: ['EQUAL_INSTALLMENTS', 'MILESTONE_BASED', 'CUSTOM'],
    default: 'EQUAL_INSTALLMENTS',
  })
  @IsIn(['EQUAL_INSTALLMENTS', 'MILESTONE_BASED', 'CUSTOM'])
  @IsOptional()
  planType?: 'EQUAL_INSTALLMENTS' | 'MILESTONE_BASED' | 'CUSTOM';

  @ApiPropertyOptional({
    description: 'Payment recurrence frequency',
    enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'],
    default: 'MONTHLY',
  })
  @IsIn(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'])
  @IsOptional()
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';

  @ApiPropertyOptional({
    description: 'Total number of installments',
    example: 36,
    default: 24,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(120)
  installmentCount?: number;

  @ApiPropertyOptional({
    description: 'Minimum booking money percentage (e.g. 10 for 10%)',
    example: 10,
    default: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  minBookingPct?: number;

  @ApiPropertyOptional({
    description: 'Default down payment percentage (e.g. 10 for 10%)',
    example: 0,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  downPaymentPct?: number;

  @ApiPropertyOptional({
    description:
      'Optional milestone configuration array (e.g. [{ name: "Piling", percentage: 20 }, ...])',
  })
  @IsOptional()
  milestoneConfig?: unknown;

  @ApiPropertyOptional({
    description: 'Whether the template is active and selectable',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this template is the company default for new quotations',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
