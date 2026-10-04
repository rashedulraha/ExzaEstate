import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class PayCommissionDto {
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

  @ApiPropertyOptional({ description: 'Payment reference or cheque number' })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
