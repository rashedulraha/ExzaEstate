import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryQuotationsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by quotation status',
    enum: ['Draft', 'Pending Approval', 'Approved', 'Sent', 'Converted', 'Expired', 'Rejected'],
  })
  @IsIn(['Draft', 'Pending Approval', 'Approved', 'Sent', 'Converted', 'Expired', 'Rejected'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by property UUID' })
  @IsUUID('all')
  @IsOptional()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Filter by customer UUID' })
  @IsUUID('all')
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter by lead UUID' })
  @IsUUID('all')
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({
    description: 'Search string across quotation number, notes, etc.',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
