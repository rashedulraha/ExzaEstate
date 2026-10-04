import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class ExportLedgerDto {
  @ApiPropertyOptional({ enum: ['PDF', 'EXCEL', 'CSV'], default: 'PDF' })
  @IsOptional()
  @IsIn(['PDF', 'EXCEL', 'CSV'])
  format?: 'PDF' | 'EXCEL' | 'CSV' = 'PDF';

  @ApiPropertyOptional({ description: 'Filter by account UUID' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Filter by account code' })
  @IsOptional()
  @IsString()
  accountCode?: string;

  @ApiPropertyOptional({ description: 'Start date in YYYY-MM-DD format' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date in YYYY-MM-DD format' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by cost center UUID' })
  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @ApiPropertyOptional({ description: 'Filter by project UUID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
