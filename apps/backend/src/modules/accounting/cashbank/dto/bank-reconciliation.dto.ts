import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { Type } from 'class-transformer';

export class CreateBankReconciliationDto {
  @ApiProperty({ example: '01a10000-0000-0000-0000-000000000001' })
  @IsUUID()
  @IsNotEmpty()
  bankAccountId!: string;

  @ApiProperty({ example: '2026-10-31' })
  @IsDateString()
  @IsNotEmpty()
  statementDate!: string;

  @ApiProperty({ example: '250000000', description: 'Bank statement closing balance in paisa' })
  @IsString()
  @IsNotEmpty()
  statementBalancePaisa!: string;

  @ApiPropertyOptional({ example: 'October 2026 Monthly Reconciliation' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MatchReconciliationItemDto {
  @ApiProperty({ example: '01a10000-0000-0000-0000-000000000003' })
  @IsUUID()
  @IsNotEmpty()
  journalLineId!: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  @IsNotEmpty()
  clearedDate!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isCleared?: boolean;

  @ApiPropertyOptional({ example: 'Cleared per bank statement line 42' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MatchReconciliationItemsRequestDto {
  @ApiProperty({ type: [MatchReconciliationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchReconciliationItemDto)
  items!: MatchReconciliationItemDto[];
}

export class ReconciliationItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  journalLineId!: string;

  @ApiProperty()
  clearedDate!: string;

  @ApiProperty()
  isCleared!: boolean;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  journalNumber?: string;

  @ApiPropertyOptional()
  postingDate?: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  debitPaisa?: string;

  @ApiPropertyOptional()
  creditPaisa?: string;
}

export class BankReconciliationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  bankAccountId!: string;

  @ApiProperty()
  statementDate!: string;

  @ApiProperty()
  statementBalancePaisa!: string;

  @ApiProperty()
  bookBalancePaisa!: string;

  @ApiProperty()
  reconciledBalancePaisa!: string;

  @ApiProperty()
  differencePaisa!: string;

  @ApiProperty({ example: 'Draft' })
  status!: string;

  @ApiPropertyOptional()
  completedAt?: string | null;

  @ApiPropertyOptional()
  completedById?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional({ type: () => [ReconciliationItemResponseDto] })
  items?: ReconciliationItemResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class UnreconciledLineDto {
  @ApiProperty()
  journalLineId!: string;

  @ApiProperty()
  journalId!: string;

  @ApiProperty()
  journalNumber!: string;

  @ApiProperty()
  postingDate!: string;

  @ApiPropertyOptional()
  narration?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  debitPaisa!: string;

  @ApiProperty()
  creditPaisa!: string;

  @ApiPropertyOptional()
  reference?: string | null;
}
