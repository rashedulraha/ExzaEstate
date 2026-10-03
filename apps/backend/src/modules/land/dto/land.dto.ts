import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CompoundAreaPartDto {
  @ApiProperty({ description: 'Numeric value of the land unit', example: 5 })
  @IsNotEmpty()
  value!: number | string;

  @ApiProperty({
    description: 'Land unit name (e.g. KATHA, DECIMAL, BIGHA, ACRE, SQFT)',
    example: 'KATHA',
  })
  @IsString()
  @IsNotEmpty()
  unit!: string;
}

export class CreateLandDto {
  @ApiProperty({ description: 'Name of the land parcel', example: 'Purbachal Sector 4 Parcel' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Unique code for the land parcel', example: 'LND-001' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: 'District', example: 'Dhaka' })
  @IsString()
  @IsNotEmpty()
  district!: string;

  @ApiProperty({ description: 'Upazila / Thana', example: 'Rupganj' })
  @IsString()
  @IsNotEmpty()
  upazila!: string;

  @ApiProperty({ description: 'Mouza', example: 'Brahmankhali' })
  @IsString()
  @IsNotEmpty()
  mouza!: string;

  @ApiPropertyOptional({ description: 'JL Number', example: 'JL-102' })
  @IsString()
  @IsOptional()
  jlNumber?: string;

  @ApiPropertyOptional({ description: 'Khatian Number', example: 'RS-452' })
  @IsString()
  @IsOptional()
  khatianNumber?: string;

  @ApiPropertyOptional({ description: 'Dag Number', example: 'CS-892, RS-1120' })
  @IsString()
  @IsOptional()
  dagNumber?: string;

  @ApiPropertyOptional({ description: 'Deed Number', example: 'DEED-9921/2024' })
  @IsString()
  @IsOptional()
  deedNumber?: string;

  @ApiPropertyOptional({
    description: 'Deed Registration Date (YYYY-MM-DD)',
    example: '2024-05-12',
  })
  @IsDateString()
  @IsOptional()
  deedDate?: string;

  @ApiPropertyOptional({ description: 'Recorded Owners / Sellers in Title Deed' })
  @IsString()
  @IsOptional()
  recordedOwners?: string;

  @ApiPropertyOptional({ description: 'Direct area in canonical square feet', example: 3600 })
  @IsOptional()
  areaSqft?: number | string;

  @ApiPropertyOptional({ description: 'Entered unit area amount', example: 5 })
  @IsOptional()
  enteredArea?: number | string;

  @ApiPropertyOptional({
    description: 'Entered unit (e.g. KATHA, DECIMAL, BIGHA)',
    example: 'KATHA',
  })
  @IsString()
  @IsOptional()
  enteredUnit?: string;

  @ApiPropertyOptional({
    description: 'Compound area specification (e.g. 5 Katha and 3 Decimal)',
    type: [CompoundAreaPartDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompoundAreaPartDto)
  @IsOptional()
  compoundArea?: CompoundAreaPartDto[];

  @ApiPropertyOptional({ description: 'Purchase price in integer paisa', example: '5000000000' })
  @IsOptional()
  purchasePricePaisa?: string | number;

  @ApiPropertyOptional({ description: 'Legal and registration cost in paisa', example: '25000000' })
  @IsOptional()
  legalCostPaisa?: string | number;

  @ApiPropertyOptional({
    description: 'Development and boundary cost in paisa',
    example: '10000000',
  })
  @IsOptional()
  developmentCostPaisa?: string | number;

  @ApiPropertyOptional({ description: 'Mutation status', example: 'COMPLETED' })
  @IsString()
  @IsOptional()
  mutationStatus?: string;

  @ApiPropertyOptional({ description: 'Land tax / dakhila status', example: 'UP_TO_DATE' })
  @IsString()
  @IsOptional()
  taxStatus?: string;

  @ApiPropertyOptional({ description: 'Ownership type (e.g. OWNED, LEASED, JV)', example: 'OWNED' })
  @IsString()
  @IsOptional()
  ownershipStatus?: string;

  @ApiPropertyOptional({ description: 'Operational status', example: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'GPS Latitude', example: 23.8103 })
  @IsOptional()
  latitude?: number | string;

  @ApiPropertyOptional({ description: 'GPS Longitude', example: 90.4125 })
  @IsOptional()
  longitude?: number | string;

  @ApiPropertyOptional({ description: 'Internal remarks or boundary description' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class UpdateLandDto {
  @ApiPropertyOptional({ description: 'Name of the land parcel' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Unique code for the land parcel' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'Upazila / Thana' })
  @IsString()
  @IsOptional()
  upazila?: string;

  @ApiPropertyOptional({ description: 'Mouza' })
  @IsString()
  @IsOptional()
  mouza?: string;

  @ApiPropertyOptional({ description: 'JL Number' })
  @IsString()
  @IsOptional()
  jlNumber?: string;

  @ApiPropertyOptional({ description: 'Khatian Number' })
  @IsString()
  @IsOptional()
  khatianNumber?: string;

  @ApiPropertyOptional({ description: 'Dag Number' })
  @IsString()
  @IsOptional()
  dagNumber?: string;

  @ApiPropertyOptional({ description: 'Deed Number' })
  @IsString()
  @IsOptional()
  deedNumber?: string;

  @ApiPropertyOptional({ description: 'Deed Registration Date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  deedDate?: string;

  @ApiPropertyOptional({ description: 'Recorded Owners / Sellers in Title Deed' })
  @IsString()
  @IsOptional()
  recordedOwners?: string;

  @ApiPropertyOptional({ description: 'Direct area in canonical square feet' })
  @IsOptional()
  areaSqft?: number | string;

  @ApiPropertyOptional({ description: 'Entered unit area amount' })
  @IsOptional()
  enteredArea?: number | string;

  @ApiPropertyOptional({ description: 'Entered unit' })
  @IsString()
  @IsOptional()
  enteredUnit?: string;

  @ApiPropertyOptional({
    description: 'Compound area specification (e.g. 5 Katha and 3 Decimal)',
    type: [CompoundAreaPartDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompoundAreaPartDto)
  @IsOptional()
  compoundArea?: CompoundAreaPartDto[];

  @ApiPropertyOptional({ description: 'Purchase price in integer paisa' })
  @IsOptional()
  purchasePricePaisa?: string | number;

  @ApiPropertyOptional({ description: 'Legal and registration cost in paisa' })
  @IsOptional()
  legalCostPaisa?: string | number;

  @ApiPropertyOptional({ description: 'Development and boundary cost in paisa' })
  @IsOptional()
  developmentCostPaisa?: string | number;

  @ApiPropertyOptional({ description: 'Mutation status' })
  @IsString()
  @IsOptional()
  mutationStatus?: string;

  @ApiPropertyOptional({ description: 'Land tax / dakhila status' })
  @IsString()
  @IsOptional()
  taxStatus?: string;

  @ApiPropertyOptional({ description: 'Ownership type' })
  @IsString()
  @IsOptional()
  ownershipStatus?: string;

  @ApiPropertyOptional({ description: 'Operational status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'GPS Latitude' })
  @IsOptional()
  latitude?: number | string;

  @ApiPropertyOptional({ description: 'GPS Longitude' })
  @IsOptional()
  longitude?: number | string;

  @ApiPropertyOptional({ description: 'Internal remarks or boundary description' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export * from './land-query.dto.js';
export * from './land-factors.dto.js';
