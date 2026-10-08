import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCashTransferDto {
  @ApiProperty({ example: '01a10000-0000-0000-0000-000000000001' })
  @IsUUID()
  @IsNotEmpty()
  sourceBankAccountId!: string;

  @ApiProperty({ example: '01a10000-0000-0000-0000-000000000002' })
  @IsUUID()
  @IsNotEmpty()
  destinationBankAccountId!: string;

  @ApiProperty({ example: '50000000', description: 'Transfer amount in paisa (BDT 5,00,000)' })
  @IsString()
  @IsNotEmpty()
  amountPaisa!: string;

  @ApiProperty({ example: '2026-10-04' })
  @IsDateString()
  @IsNotEmpty()
  transferDate!: string;

  @ApiPropertyOptional({ example: 'CHQ-778899' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  referenceNumber?: string;

  @ApiPropertyOptional({
    example: 'Transfer from DBBL Corporate to Cash Office for petty cash replenishment',
  })
  @IsOptional()
  @IsString()
  narration?: string;
}

export class CashTransferResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  transferNumber!: string;

  @ApiProperty()
  sourceBankAccountId!: string;

  @ApiProperty()
  destinationBankAccountId!: string;

  @ApiProperty()
  amountPaisa!: string;

  @ApiProperty()
  transferDate!: string;

  @ApiPropertyOptional()
  referenceNumber?: string | null;

  @ApiPropertyOptional()
  narration?: string | null;

  @ApiProperty()
  journalId!: string;

  @ApiProperty()
  createdById!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
