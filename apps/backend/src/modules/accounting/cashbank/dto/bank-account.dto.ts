import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const BANK_ACCOUNT_TYPES = ['BANK', 'CASH', 'WALLET'] as const;
export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];

export class CreateBankAccountDto {
  @ApiProperty({ enum: BANK_ACCOUNT_TYPES, example: 'BANK' })
  @IsIn(BANK_ACCOUNT_TYPES)
  accountType!: BankAccountType;

  @ApiProperty({ example: 'Dutch-Bangla Bank Corporate Account' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ example: '1071100012345' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  accountNumber?: string;

  @ApiPropertyOptional({ example: '01a10000-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID()
  bankId?: string;

  @ApiPropertyOptional({ example: '01a10000-0000-0000-0000-000000000002' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ example: '090261623' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  routingNumber?: string;

  @ApiPropertyOptional({ example: 'DBBLBDDH' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  swiftCode?: string;

  @ApiPropertyOptional({ example: 'BDT', default: 'BDT' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiPropertyOptional({ example: '1020-01' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  coaAccountCode?: string;

  @ApiPropertyOptional({ example: '0' })
  @IsOptional()
  @IsString()
  initialBalancePaisa?: string;
}

export class UpdateBankAccountDto {
  @ApiPropertyOptional({ example: 'DBBL Main Operations Account' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({ example: '090261623' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  routingNumber?: string;

  @ApiPropertyOptional({ example: 'DBBLBDDH' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  swiftCode?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BankBranchRefDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  routingNumber!: string;

  @ApiPropertyOptional()
  district?: string | null;
}

export class BankRefDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiPropertyOptional()
  swiftCode?: string | null;

  @ApiPropertyOptional({ type: () => [BankBranchRefDto] })
  branches?: BankBranchRefDto[];
}

export class BankAccountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ enum: BANK_ACCOUNT_TYPES })
  accountType!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  accountNumberMasked?: string | null;

  @ApiPropertyOptional()
  bankId?: string | null;

  @ApiPropertyOptional({ type: () => BankRefDto })
  bank?: BankRefDto | null;

  @ApiPropertyOptional()
  branchId?: string | null;

  @ApiPropertyOptional({ type: () => BankBranchRefDto })
  branch?: BankBranchRefDto | null;

  @ApiPropertyOptional()
  routingNumber?: string | null;

  @ApiPropertyOptional()
  swiftCode?: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  coaAccountId!: string;

  @ApiProperty()
  coaAccountCode!: string;

  @ApiProperty()
  initialBalancePaisa!: string;

  @ApiProperty()
  currentBalancePaisa!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
