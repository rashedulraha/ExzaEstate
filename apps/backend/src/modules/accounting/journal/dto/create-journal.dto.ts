import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { JOURNAL_TYPES, type JournalType } from '@exzaestate/shared';

export class CreateJournalLineDto {
  @ApiProperty({ description: 'Target account UUID', format: 'uuid' })
  @IsUUID('7')
  @IsNotEmpty()
  accountId!: string;

  @ApiPropertyOptional({
    description: 'Debit amount in integer paisa (e.g. "50000000" for BDT 5,00,000)',
    example: '50000000',
    default: '0',
  })
  @IsOptional()
  @IsString()
  debitPaisa?: string;

  @ApiPropertyOptional({
    description: 'Credit amount in integer paisa (e.g. "50000000" for BDT 5,00,000)',
    example: '0',
    default: '0',
  })
  @IsOptional()
  @IsString()
  creditPaisa?: string;

  @ApiPropertyOptional({
    description: 'Line narration / description',
    example: 'Booking fee receivable',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Party type (CUSTOMER, VENDOR, BROKER)',
    example: 'CUSTOMER',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  partyType?: string;

  @ApiPropertyOptional({ description: 'Party UUID (customer/vendor/broker ID)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @ApiPropertyOptional({ description: 'Cost center code / name', example: 'PROJECT-01' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  costCenter?: string;

  @ApiPropertyOptional({ description: 'Linked project UUID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class CreateJournalDto {
  @ApiProperty({ description: 'Business posting date (YYYY-MM-DD)', example: '2026-10-04' })
  @IsDateString()
  @IsNotEmpty()
  postingDate!: string;

  @ApiPropertyOptional({
    description: 'Journal type',
    enum: JOURNAL_TYPES,
    default: JOURNAL_TYPES.GENERAL,
  })
  @IsOptional()
  @IsEnum(JOURNAL_TYPES)
  type?: JournalType;

  @ApiProperty({
    description: 'Voucher narration / business description',
    example: 'Adjustment entry for monthly utility accruals',
    minLength: 3,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  narration!: string;

  @ApiPropertyOptional({
    description: 'External document / voucher reference',
    example: 'VOUCHER-2026-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  reference?: string;

  @ApiPropertyOptional({ description: 'Source module', example: 'MANUAL' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceModule?: string;

  @ApiProperty({
    description: 'Multi-line journal entries (minimum 2 lines)',
    type: [CreateJournalLineDto],
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'A journal voucher must have at least 2 lines (debit and credit)' })
  @ValidateNested({ each: true })
  @Type(() => CreateJournalLineDto)
  lines!: CreateJournalLineDto[];
}
