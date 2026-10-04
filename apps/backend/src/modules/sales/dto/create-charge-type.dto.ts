import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateChargeTypeDto {
  @ApiProperty({
    description: 'Unique charge type code (e.g. REGISTRATION, UTILITY, PARKING)',
    example: 'UTILITY',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code must only contain uppercase letters, numbers, underscores and hyphens',
  })
  code!: string;

  @ApiProperty({
    description: 'Human-readable charge name',
    example: 'Utility Connection Charge',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    description: 'Description of the fee and coverage',
    example: 'Water, electricity and gas connection infrastructure fee.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Calculation method: FIXED amount or PERCENTAGE of property net price',
    enum: ['FIXED', 'PERCENTAGE'],
    default: 'FIXED',
  })
  @IsIn(['FIXED', 'PERCENTAGE'])
  @IsOptional()
  calculationType?: 'FIXED' | 'PERCENTAGE';

  @ApiPropertyOptional({
    description: 'Default amount in paisa (when calculationType is FIXED)',
    example: '15000000',
  })
  @IsNumberString()
  @IsOptional()
  defaultAmountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Default percentage rate (e.g. 8 for 8% when calculationType is PERCENTAGE)',
    example: 8.0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  defaultRatePct?: number;

  @ApiPropertyOptional({
    description:
      'Whether the fee is already included in net property price (true) or additional (false)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isIncludedInNetPrice?: boolean;

  @ApiPropertyOptional({
    description: 'When the charge is payable by the buyer',
    enum: ['AT_BOOKING', 'IN_SCHEDULE', 'AT_HANDOVER', 'ON_DEMAND'],
    default: 'AT_BOOKING',
  })
  @IsIn(['AT_BOOKING', 'IN_SCHEDULE', 'AT_HANDOVER', 'ON_DEMAND'])
  @IsOptional()
  payableStage?: 'AT_BOOKING' | 'IN_SCHEDULE' | 'AT_HANDOVER' | 'ON_DEMAND';

  @ApiPropertyOptional({
    description: 'VAT rate percentage applicable to this charge type (default 0%)',
    example: 5.0,
    default: 0.0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  vatRatePct?: number;

  @ApiPropertyOptional({
    description: 'GL account mapping code (e.g. 4900 for other income or 2400 for tax liability)',
    example: '4900',
  })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  accountCode?: string;

  @ApiPropertyOptional({
    description: 'Whether this charge type is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
