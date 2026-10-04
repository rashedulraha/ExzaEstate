import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
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

export class ChargeCalculationItemDto {
  @ApiPropertyOptional({
    description:
      'Existing ChargeType UUID from catalogue (if supplied, defaults are loaded from DB)',
  })
  @IsUUID('all')
  @IsOptional()
  chargeTypeId?: string;

  @ApiPropertyOptional({
    description: 'Code of the charge (e.g. UTILITY, REGISTRATION)',
    example: 'REGISTRATION',
  })
  @IsString()
  @IsOptional()
  chargeTypeCode?: string;

  @ApiPropertyOptional({
    description: 'Name of the charge (required if chargeTypeId is omitted)',
    example: 'Utility Connection Charge',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Calculation type',
    enum: ['FIXED', 'PERCENTAGE'],
  })
  @IsIn(['FIXED', 'PERCENTAGE'])
  @IsOptional()
  calculationType?: 'FIXED' | 'PERCENTAGE';

  @ApiPropertyOptional({
    description: 'Explicit charge amount in paisa (when calculationType is FIXED)',
    example: '15000000',
  })
  @IsNumberString()
  @IsOptional()
  amountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Percentage rate of property net price (when calculationType is PERCENTAGE)',
    example: 8.0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  ratePct?: number;

  @ApiPropertyOptional({
    description: 'Whether this charge is included in the net property price',
  })
  @IsBoolean()
  @IsOptional()
  isIncludedInNetPrice?: boolean;

  @ApiPropertyOptional({
    description: 'Payable stage',
    enum: ['AT_BOOKING', 'IN_SCHEDULE', 'AT_HANDOVER', 'ON_DEMAND'],
  })
  @IsIn(['AT_BOOKING', 'IN_SCHEDULE', 'AT_HANDOVER', 'ON_DEMAND'])
  @IsOptional()
  payableStage?: 'AT_BOOKING' | 'IN_SCHEDULE' | 'AT_HANDOVER' | 'ON_DEMAND';

  @ApiPropertyOptional({
    description: 'VAT percentage rate for this charge (defaults to chargeType rate or 0)',
    example: 5.0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  vatRatePct?: number;
}

export class CalculateChargesDto {
  @ApiProperty({
    description: 'Base net property price in paisa',
    example: '500000000',
  })
  @IsNumberString()
  @IsNotEmpty()
  netPricePaisa!: string;

  @ApiProperty({
    description: 'List of charges to calculate and itemise',
    type: [ChargeCalculationItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChargeCalculationItemDto)
  charges!: ChargeCalculationItemDto[];
}
