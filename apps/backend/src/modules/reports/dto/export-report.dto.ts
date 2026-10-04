import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class ExportReportDto {
  @ApiPropertyOptional({ enum: ['PDF', 'EXCEL', 'CSV'], default: 'PDF' })
  @IsOptional()
  @IsIn(['PDF', 'EXCEL', 'CSV'])
  format?: 'PDF' | 'EXCEL' | 'CSV' = 'PDF';

  @ApiPropertyOptional({ description: 'Start date in YYYY-MM-DD format' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date in YYYY-MM-DD format' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'As-of date in YYYY-MM-DD format' })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @ApiPropertyOptional({ description: 'Filter by cost center UUID' })
  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @ApiPropertyOptional({ description: 'Filter by project UUID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class ReportExportJobResponseDto {
  @ApiProperty({ description: 'Asynchronous background job ID' })
  jobId!: string;

  @ApiProperty({ description: 'Queue job status', default: 'QUEUED' })
  status!: string;

  @ApiProperty({ description: 'Descriptive status message' })
  message!: string;
}
