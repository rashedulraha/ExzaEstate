import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { FacingDirection, OwnerType, PropertyType } from './create-property.dto.js';

export class UpdatePropertyDto {
  @ApiPropertyOptional({ description: 'Optional Block or Zone UUID' })
  @IsUUID('all')
  @IsOptional()
  blockId?: string;

  @ApiPropertyOptional({ description: 'Optional Road or Floor UUID' })
  @IsUUID('all')
  @IsOptional()
  floorId?: string;

  @ApiPropertyOptional({ description: 'Display title for the unit' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Property type', enum: PropertyType })
  @IsEnum(PropertyType)
  @IsOptional()
  type?: PropertyType;

  @ApiPropertyOptional({ description: 'Area in square feet', example: '1450.5000' })
  @IsNumberString()
  @IsOptional()
  areaSqft?: string;

  @ApiPropertyOptional({ description: 'Facing direction', enum: FacingDirection })
  @IsEnum(FacingDirection)
  @IsOptional()
  facing?: FacingDirection;

  @ApiPropertyOptional({ description: 'Base price in integer paisa', example: '1200000000' })
  @IsNumberString()
  @IsOptional()
  basePricePaisa?: string;

  @ApiPropertyOptional({ description: 'Premium price in integer paisa', example: '50000000' })
  @IsNumberString()
  @IsOptional()
  premiumPaisa?: string;

  @ApiPropertyOptional({ description: 'Discount limit percentage (0-100)', example: '5.00' })
  @IsNumberString()
  @IsOptional()
  discountLimitPct?: string;

  @ApiPropertyOptional({ description: 'Owner type', enum: OwnerType })
  @IsEnum(OwnerType)
  @IsOptional()
  ownerType?: OwnerType;

  @ApiPropertyOptional({ description: 'Detailed unit description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Additional extensible metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
