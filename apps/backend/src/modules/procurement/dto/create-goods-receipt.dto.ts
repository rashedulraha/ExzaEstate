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

export class CreateGoodsReceiptLineDto {
  @ApiPropertyOptional({ description: 'Purchase Order line ID (UUID)' })
  @IsUUID()
  @IsOptional()
  poLineId?: string;

  @ApiProperty({
    description: 'Material / item description',
    example: 'Grade 60 16mm TMT Deformed Rebar',
  })
  @IsString()
  @IsNotEmpty()
  itemDescription!: string;

  @ApiProperty({ description: 'Delivered quantity (decimal string)', example: '5.00' })
  @IsString()
  @IsNotEmpty()
  receivedQuantity!: string;

  @ApiProperty({
    description: 'Accepted quantity after QA inspection (decimal string)',
    example: '4.80',
  })
  @IsString()
  @IsNotEmpty()
  acceptedQuantity!: string;

  @ApiPropertyOptional({
    description: 'Rejected quantity (decimal string)',
    example: '0.20',
    default: '0.00',
  })
  @IsString()
  @IsOptional()
  rejectedQuantity?: string;

  @ApiPropertyOptional({ description: 'Unit of measure', example: 'TON', default: 'PCS' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: 'Unit price in paisa', example: '8500000' })
  @IsNumberString()
  @IsNotEmpty()
  unitPricePaisa!: string;

  @ApiPropertyOptional({
    description: 'Reason for rejecting sub-lot',
    example: 'Surface corrosion / bend defect',
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Line inspection notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateGoodsReceiptDto {
  @ApiProperty({ description: 'Purchase Order ID (UUID)' })
  @IsUUID()
  @IsNotEmpty()
  poId!: string;

  @ApiPropertyOptional({ description: 'Receipt date (ISO string)' })
  @IsDateString()
  @IsOptional()
  receiptDate?: string;

  @ApiPropertyOptional({ description: 'Supplier Delivery Challan Number', example: 'CH-2026-9812' })
  @IsString()
  @IsOptional()
  challanNumber?: string;

  @ApiPropertyOptional({ description: 'Receiving inspection notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Received material line items', type: [CreateGoodsReceiptLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptLineDto)
  lines!: CreateGoodsReceiptLineDto[];
}
