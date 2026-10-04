import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReversePaymentDto {
  @ApiProperty({ example: 'Payment posted in error to wrong account' })
  @IsNotEmpty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  approvalId?: string;
}

export class PaymentReversalResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  paymentId!: string;

  @ApiProperty({ example: 'REV-2026-00001' })
  reversalNumber!: string;

  @ApiProperty()
  reason!: string;

  @ApiPropertyOptional()
  approvalId?: string | null;

  @ApiPropertyOptional()
  journalId?: string | null;

  @ApiProperty()
  reversedById!: string;

  @ApiProperty()
  createdAt!: string;
}
