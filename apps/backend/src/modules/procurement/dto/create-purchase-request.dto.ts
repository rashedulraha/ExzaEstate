import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreatePurchaseRequestLineDto {
  @ApiProperty({
    description: 'Item or material description',
    example: 'Portland Composite Cement (50kg bag)',
  })
  @IsString()
  @IsNotEmpty()
  itemDescription!: string;

  @ApiPropertyOptional({ description: 'Category', example: 'CEMENT', default: 'GENERAL' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Quantity (decimal string)', example: '500.00' })
  @IsString()
  @IsNotEmpty()
  quantity!: string;

  @ApiPropertyOptional({ description: 'Measurement unit', example: 'BAG', default: 'PCS' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: 'Estimated unit price in paisa', example: '55000' })
  @IsNumberString()
  @IsNotEmpty()
  estimatedUnitPricePaisa!: string;

  @ApiPropertyOptional({ description: 'Line notes / specifications' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePurchaseRequestDto {
  @ApiProperty({
    description: 'Request Title',
    example: 'Basement Casting Cement & Rebar Procurement',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'Project ID (UUID)' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Requesting department', example: 'Civil Engineering' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'Required date (ISO string)' })
  @IsDateString()
  @IsOptional()
  requiredDate?: string;

  @ApiPropertyOptional({ description: 'Priority level', example: 'HIGH', default: 'MEDIUM' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ description: 'General notes / rationale' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Material request line items', type: [CreatePurchaseRequestLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseRequestLineDto)
  lines!: CreatePurchaseRequestLineDto[];
}

export class UpdatePurchaseRequestDto {
  @ApiPropertyOptional({ description: 'Request Title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Project ID (UUID)' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Requesting department' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'Required date (ISO string)' })
  @IsDateString()
  @IsOptional()
  requiredDate?: string;

  @ApiPropertyOptional({ description: 'Priority level' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ description: 'General notes / rationale' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Material request line items',
    type: [CreatePurchaseRequestLineDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseRequestLineDto)
  lines?: CreatePurchaseRequestLineDto[];
}

export class RejectPurchaseRequestDto {
  @ApiProperty({
    description: 'Mandatory rejection reason',
    example: 'Exceeds monthly project allocation threshold',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
