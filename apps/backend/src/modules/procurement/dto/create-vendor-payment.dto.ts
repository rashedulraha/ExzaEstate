import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class VendorPaymentAllocationDto {
  @ApiProperty({ description: 'Vendor Bill ID (UUID)' })
  @IsUUID()
  @IsNotEmpty()
  billId!: string;

  @ApiProperty({ description: 'Amount in paisa allocated to this bill', example: '50000000' })
  @IsString()
  @IsNotEmpty()
  amountPaisa!: string;
}

export class CreateVendorPaymentDto {
  @ApiProperty({ description: 'Vendor ID (UUID)' })
  @IsUUID()
  @IsNotEmpty()
  vendorId!: string;

  @ApiProperty({ description: 'Total payment amount in paisa', example: '50000000' })
  @IsString()
  @IsNotEmpty()
  amountPaisa!: string;

  @ApiPropertyOptional({
    description: 'Payment method',
    enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE'],
    default: 'BANK_TRANSFER',
  })
  @IsIn(['CASH', 'BANK_TRANSFER', 'CHEQUE'])
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Bank Account ID (UUID)' })
  @IsUUID()
  @IsOptional()
  bankAccountId?: string;

  @ApiPropertyOptional({ description: 'Bank Account Code (e.g. 1020-01)' })
  @IsString()
  @IsOptional()
  bankAccountCode?: string;

  @ApiPropertyOptional({ description: 'Payment date (ISO string)' })
  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @ApiPropertyOptional({ description: 'Payment reference or cheque number' })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Bill allocations',
    type: [VendorPaymentAllocationDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VendorPaymentAllocationDto)
  allocations?: VendorPaymentAllocationDto[];
}
