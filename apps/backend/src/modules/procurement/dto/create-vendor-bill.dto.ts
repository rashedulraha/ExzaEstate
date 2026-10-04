import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateVendorBillLineDto {
  @ApiProperty({ description: 'COA account code', example: '1210' })
  @IsString()
  @IsNotEmpty()
  accountCode!: string;

  @ApiProperty({ description: 'Line item description' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'Amount in paisa', example: '50000000' })
  @IsString()
  @IsNotEmpty()
  amountPaisa!: string;

  @ApiPropertyOptional({ description: 'Cost Center identifier' })
  @IsString()
  @IsOptional()
  costCenter?: string;

  @ApiPropertyOptional({ description: 'Project ID (UUID)' })
  @IsUUID()
  @IsOptional()
  projectId?: string;
}

export class CreateVendorBillDto {
  @ApiProperty({ description: 'Vendor ID (UUID)' })
  @IsUUID()
  @IsNotEmpty()
  vendorId!: string;

  @ApiPropertyOptional({ description: 'Project ID (UUID)' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Bill date (ISO string)' })
  @IsDateString()
  @IsOptional()
  billDate?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO string)' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'TDS withholding in paisa', default: '0' })
  @IsString()
  @IsOptional()
  taxWithholdingPaisa?: string;

  @ApiPropertyOptional({ description: 'VDS withholding in paisa', default: '0' })
  @IsString()
  @IsOptional()
  vatWithholdingPaisa?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Post immediately upon creation', default: true })
  @IsBoolean()
  @IsOptional()
  postImmediately?: boolean;

  @ApiProperty({ description: 'Bill charge lines', type: [CreateVendorBillLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVendorBillLineDto)
  lines!: CreateVendorBillLineDto[];
}
