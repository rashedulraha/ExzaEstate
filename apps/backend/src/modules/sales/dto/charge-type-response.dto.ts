import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChargeTypeResponseDto {
  @ApiProperty({ description: 'Charge type UUID', example: '018f6c44-0000-7000-8000-000000000001' })
  id!: string;

  @ApiProperty({ description: 'Company UUID', example: '018f6c44-0000-7000-8000-000000000002' })
  companyId!: string;

  @ApiProperty({ description: 'Charge code', example: 'UTILITY' })
  code!: string;

  @ApiProperty({ description: 'Charge name', example: 'Utility Connection Charge' })
  name!: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string | null;

  @ApiProperty({ description: 'Calculation type (FIXED | PERCENTAGE)', example: 'FIXED' })
  calculationType!: string;

  @ApiPropertyOptional({ description: 'Default amount in paisa', example: '15000000' })
  defaultAmountPaisa?: string | null;

  @ApiPropertyOptional({ description: 'Formatted default amount in BDT', example: '৳1,50,000.00' })
  defaultAmountFormatted?: string | null;

  @ApiPropertyOptional({ description: 'Default percentage rate', example: 8.0 })
  defaultRatePct?: number | null;

  @ApiProperty({ description: 'Whether charge is included in property net price', example: false })
  isIncludedInNetPrice!: boolean;

  @ApiProperty({ description: 'Payable stage', example: 'AT_BOOKING' })
  payableStage!: string;

  @ApiProperty({ description: 'VAT rate percentage', example: 5.0 })
  vatRatePct!: number;

  @ApiPropertyOptional({ description: 'Account code for GL posting', example: '4900' })
  accountCode?: string | null;

  @ApiProperty({ description: 'Active status', example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Created by user UUID' })
  createdById?: string | null;

  @ApiPropertyOptional({ description: 'Updated by user UUID' })
  updatedById?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: string;
}

export class ChargeTypeListResponseDto {
  @ApiProperty({ type: [ChargeTypeResponseDto] })
  items!: ChargeTypeResponseDto[];

  @ApiProperty({ description: 'Total matching items', example: 7 })
  total!: number;

  @ApiProperty({ description: 'Current page', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Items per page', example: 50 })
  limit!: number;
}
