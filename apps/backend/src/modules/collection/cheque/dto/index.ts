import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ClearChequeDto {
  @ApiPropertyOptional({ example: '2026-10-06', description: 'Clearing date YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  clearingDate?: string;

  @ApiPropertyOptional({ example: '1020', description: 'Target bank account code' })
  @IsOptional()
  @IsString()
  bankAccountCode?: string;

  @ApiPropertyOptional({ example: 'Cleared via Dhaka Bank principal branch' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BounceChequeDto {
  @ApiProperty({ example: 'Insufficient funds' })
  @IsNotEmpty()
  @IsString()
  bounceReason!: string;

  @ApiPropertyOptional({ example: 'Dishonour memo attached' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ChequeEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  paymentId!: string;

  @ApiProperty({ example: 'CLEARED', enum: ['RECEIVED', 'CLEARED', 'BOUNCED'] })
  event!: string;

  @ApiProperty()
  chequeNumber!: string;

  @ApiPropertyOptional()
  bankName?: string | null;

  @ApiPropertyOptional()
  branchName?: string | null;

  @ApiPropertyOptional()
  chequeDate?: string | null;

  @ApiPropertyOptional()
  clearingDate?: string | null;

  @ApiPropertyOptional()
  bounceReason?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdById!: string;

  @ApiProperty()
  createdAt!: string;
}
