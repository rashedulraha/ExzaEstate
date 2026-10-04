import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountingPeriodResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  fiscalYearId!: string;

  @ApiProperty({ example: 1 })
  periodNumber!: number;

  @ApiProperty({ example: 'July 2026' })
  name!: string;

  @ApiProperty({ example: '2026-07-01' })
  startDate!: string;

  @ApiProperty({ example: '2026-07-31' })
  endDate!: string;

  @ApiProperty({ example: 'Open', enum: ['Open', 'Closed', 'Locked'] })
  status!: string;

  @ApiPropertyOptional({ type: Date, nullable: true })
  closedAt?: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  closedById?: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  reopenedAt?: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  reopenedById?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  reopenReason?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class FiscalYearResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'FY 2026-2027' })
  name!: string;

  @ApiProperty({ example: '2026-07-01' })
  startDate!: string;

  @ApiProperty({ example: '2027-06-30' })
  endDate!: string;

  @ApiProperty({ example: false })
  isClosed!: boolean;

  @ApiPropertyOptional({ type: () => [AccountingPeriodResponseDto] })
  periods?: AccountingPeriodResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
