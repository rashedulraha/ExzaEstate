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

export class CreatePurchaseOrderLineDto {
  @ApiPropertyOptional({ description: 'Originating PR line ID (UUID)' })
  @IsUUID()
  @IsOptional()
  prLineId?: string;

  @ApiProperty({ description: 'Item description', example: '500W High Mast Site Lighting Unit' })
  @IsString()
  @IsNotEmpty()
  itemDescription!: string;

  @ApiPropertyOptional({ description: 'Category', example: 'ELECTRICAL', default: 'GENERAL' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Ordered quantity (decimal string)', example: '10.00' })
  @IsString()
  @IsNotEmpty()
  quantity!: string;

  @ApiPropertyOptional({ description: 'Unit of measure', example: 'PCS', default: 'PCS' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: 'Negotiated unit price in paisa', example: '2500000' })
  @IsNumberString()
  @IsNotEmpty()
  unitPricePaisa!: string;

  @ApiPropertyOptional({ description: 'Line notes / item specs' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'Vendor ID (UUID)' })
  @IsUUID()
  @IsNotEmpty()
  vendorId!: string;

  @ApiPropertyOptional({ description: 'Originating Purchase Request ID (UUID)' })
  @IsUUID()
  @IsOptional()
  prId?: string;

  @ApiPropertyOptional({ description: 'Project ID (UUID)' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Order date (ISO string)' })
  @IsDateString()
  @IsOptional()
  orderDate?: string;

  @ApiPropertyOptional({ description: 'Expected delivery date (ISO string)' })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({ description: 'Site or warehouse delivery address' })
  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Payment and delivery terms' })
  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @ApiPropertyOptional({ description: 'Order notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Purchase Order line items', type: [CreatePurchaseOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines!: CreatePurchaseOrderLineDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ description: 'Expected delivery date (ISO string)' })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({ description: 'Site or warehouse delivery address' })
  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Terms and conditions' })
  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @ApiPropertyOptional({ description: 'Order notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Purchase Order line items',
    type: [CreatePurchaseOrderLineDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines?: CreatePurchaseOrderLineDto[];
}

export class ConvertPrToPoDto {
  @ApiProperty({ description: 'Target Vendor ID (UUID)' })
  @IsUUID()
  @IsNotEmpty()
  vendorId!: string;

  @ApiPropertyOptional({ description: 'Expected delivery date (ISO string)' })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({ description: 'Site delivery address' })
  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Terms and conditions' })
  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @ApiPropertyOptional({ description: 'Purchase order notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
