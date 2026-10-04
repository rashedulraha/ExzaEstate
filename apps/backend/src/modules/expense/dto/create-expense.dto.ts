import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Category ID (UUID)' })
  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @ApiPropertyOptional({ description: 'Project ID (UUID) if project-related' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Cost Center identifier' })
  @IsString()
  @IsOptional()
  costCenter?: string;

  @ApiProperty({ description: 'Payee name or vendor name', example: 'Rahim Traders' })
  @IsString()
  @IsNotEmpty()
  payeeName!: string;

  @ApiPropertyOptional({ description: 'Linked Vendor ID (UUID)' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiProperty({ description: 'Amount in paisa as string/bigint', example: '60000000' })
  @IsString()
  @IsNotEmpty()
  amountPaisa!: string;

  @ApiProperty({ description: 'Expense description / purpose' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ description: 'Expense date (ISO string)', example: '2026-10-05' })
  @IsDateString()
  @IsOptional()
  expenseDate?: string;

  @ApiPropertyOptional({
    description: 'Payment method',
    enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE'],
    default: 'BANK_TRANSFER',
  })
  @IsIn(['CASH', 'BANK_TRANSFER', 'CHEQUE'])
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Pay later flag (accrues to 2100 AP)', default: false })
  @IsBoolean()
  @IsOptional()
  paidLater?: boolean;

  @ApiPropertyOptional({ description: 'Bank Account ID (UUID)' })
  @IsUUID()
  @IsOptional()
  bankAccountId?: string;

  @ApiPropertyOptional({ description: 'Bank Account Code (e.g. 1020-01)' })
  @IsString()
  @IsOptional()
  bankAccountCode?: string;
}
