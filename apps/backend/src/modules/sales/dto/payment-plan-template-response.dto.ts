import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentPlanTemplateResponseDto {
  @ApiProperty({ description: 'Template UUID', example: '018f6c44-0000-7000-8000-000000000001' })
  id!: string;

  @ApiProperty({ description: 'Company UUID', example: '018f6c44-0000-7000-8000-000000000002' })
  companyId!: string;

  @ApiProperty({ description: 'Template code', example: 'STD-36M' })
  code!: string;

  @ApiProperty({
    description: 'Template name',
    example: 'Standard 36-Month Equal Installment Plan',
  })
  name!: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string | null;

  @ApiProperty({ description: 'Plan calculation type', example: 'EQUAL_INSTALLMENTS' })
  planType!: string;

  @ApiProperty({ description: 'Installment frequency', example: 'MONTHLY' })
  frequency!: string;

  @ApiProperty({ description: 'Number of installments', example: 36 })
  installmentCount!: number;

  @ApiProperty({ description: 'Minimum booking money percentage', example: 10 })
  minBookingPct!: number;

  @ApiProperty({ description: 'Default down payment percentage', example: 0 })
  downPaymentPct!: number;

  @ApiPropertyOptional({ description: 'Milestone configuration' })
  milestoneConfig?: unknown;

  @ApiProperty({ description: 'Active status', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Default template flag', example: true })
  isDefault!: boolean;

  @ApiPropertyOptional({ description: 'Created by user UUID' })
  createdById?: string | null;

  @ApiPropertyOptional({ description: 'Updated by user UUID' })
  updatedById?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: string;
}

export class PaymentPlanTemplateListResponseDto {
  @ApiProperty({ type: [PaymentPlanTemplateResponseDto] })
  items!: PaymentPlanTemplateResponseDto[];

  @ApiProperty({ description: 'Total matching items', example: 4 })
  total!: number;

  @ApiProperty({ description: 'Current page', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Items per page', example: 50 })
  limit!: number;
}
