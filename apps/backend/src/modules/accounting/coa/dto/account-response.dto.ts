import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountResponseDto {
  @ApiProperty({ description: 'Account UUIDv7 ID' })
  id!: string;

  @ApiProperty({ description: 'Company ID' })
  companyId!: string;

  @ApiProperty({ description: 'Account code (e.g. 1010)' })
  code!: string;

  @ApiProperty({ description: 'Account title / name' })
  name!: string;

  @ApiProperty({ description: 'Category: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE' })
  type!: string;

  @ApiPropertyOptional({ description: 'Parent account ID' })
  parentId!: string | null;

  @ApiProperty({ description: 'Whether this account is a group header' })
  isGroup!: boolean;

  @ApiProperty({ description: 'Whether this account is a system account' })
  isSystem!: boolean;

  @ApiPropertyOptional({ description: 'Subledger party type: CUSTOMER, VENDOR, BROKER' })
  partyType!: string | null;

  @ApiProperty({ description: 'Active status' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Optional description' })
  description!: string | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: string;
}

export class AccountBalanceResponseDto {
  @ApiProperty({ description: 'Account UUIDv7 ID' })
  accountId!: string;

  @ApiProperty({ description: 'Account code' })
  code!: string;

  @ApiProperty({ description: 'Account title' })
  name!: string;

  @ApiProperty({ description: 'Account type' })
  type!: string;

  @ApiProperty({ description: 'Net balance in integer paisa as string', example: '50000000' })
  balancePaisa!: string;

  @ApiProperty({
    description: 'Formatted balance in Bangladeshi notation',
    example: 'BDT 5,00,000.00',
  })
  formattedBalance!: string;
}
