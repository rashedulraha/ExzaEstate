import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum PropertyType {
  PLOT = 'PLOT',
  FLAT = 'FLAT',
  SHOP = 'SHOP',
  OFFICE = 'OFFICE',
  PARKING = 'PARKING',
}

export enum FacingDirection {
  NORTH = 'NORTH',
  SOUTH = 'SOUTH',
  EAST = 'EAST',
  WEST = 'WEST',
  NORTH_EAST = 'NORTH_EAST',
  SOUTH_EAST = 'SOUTH_EAST',
  NORTH_WEST = 'NORTH_WEST',
  SOUTH_WEST = 'SOUTH_WEST',
}

export enum OwnerType {
  COMPANY = 'COMPANY',
  LANDOWNER = 'LANDOWNER',
}

export class CreatePropertyDto {
  @ApiProperty({
    description: 'Target project UUID',
    example: '0192a000-0000-7000-8000-000000000001',
  })
  @IsUUID('all')
  @IsNotEmpty()
  projectId!: string;

  @ApiPropertyOptional({ description: 'Optional Block or Zone UUID' })
  @IsUUID('all')
  @IsOptional()
  blockId?: string;

  @ApiPropertyOptional({ description: 'Optional Road or Floor UUID' })
  @IsUUID('all')
  @IsOptional()
  floorId?: string;

  @ApiProperty({ description: 'Unique property unit code in the project', example: 'FLAT-A1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiPropertyOptional({
    description: 'Display title for the unit',
    example: '3BHK South-Facing Corner Unit',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ description: 'Property type', enum: PropertyType, example: PropertyType.FLAT })
  @IsEnum(PropertyType)
  @IsNotEmpty()
  type!: PropertyType;

  @ApiProperty({ description: 'Area in square feet', example: '1450.5000' })
  @IsNumberString()
  @IsNotEmpty()
  areaSqft!: string;

  @ApiPropertyOptional({
    description: 'Facing direction',
    enum: FacingDirection,
    example: FacingDirection.SOUTH,
  })
  @IsEnum(FacingDirection)
  @IsOptional()
  facing?: FacingDirection;

  @ApiProperty({ description: 'Base price in integer paisa', example: '1200000000' })
  @IsNumberString()
  @IsNotEmpty()
  basePricePaisa!: string;

  @ApiPropertyOptional({
    description: 'Premium price in integer paisa',
    example: '50000000',
    default: '0',
  })
  @IsNumberString()
  @IsOptional()
  premiumPaisa?: string;

  @ApiPropertyOptional({
    description: 'Discount limit percentage (0-100)',
    example: '5.00',
    default: '0.00',
  })
  @IsNumberString()
  @IsOptional()
  discountLimitPct?: string;

  @ApiPropertyOptional({
    description: 'Owner type',
    enum: OwnerType,
    example: OwnerType.COMPANY,
    default: OwnerType.COMPANY,
  })
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
