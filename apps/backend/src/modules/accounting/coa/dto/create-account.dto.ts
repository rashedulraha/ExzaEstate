import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  ACCOUNT_PARTY_TYPES,
  ACCOUNT_TYPES,
  type AccountPartyType,
  type AccountType,
} from '@exzaestate/shared';

export class CreateAccountDto {
  @ApiProperty({ description: 'Account code (typically 4 digits)', example: '1021' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  code!: string;

  @ApiProperty({ description: 'Account title / name', example: 'City Bank Principal Branch' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;

  @ApiProperty({
    description: 'Account category',
    enum: Object.values(ACCOUNT_TYPES),
    example: 'ASSET',
  })
  @IsEnum(ACCOUNT_TYPES)
  type!: AccountType;

  @ApiPropertyOptional({
    description: 'Parent account ID for hierarchy',
    example: '01924b80-0000-7000-8000-000000000001',
  })
  @IsOptional()
  @IsUUID('7')
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Whether this account is a summary header/group',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @ApiPropertyOptional({
    description: 'Associated subledger party type',
    enum: Object.values(ACCOUNT_PARTY_TYPES),
  })
  @IsOptional()
  @IsEnum(ACCOUNT_PARTY_TYPES)
  partyType?: AccountPartyType;

  @ApiPropertyOptional({ description: 'Optional description of the account purpose' })
  @IsOptional()
  @IsString()
  description?: string;
}
