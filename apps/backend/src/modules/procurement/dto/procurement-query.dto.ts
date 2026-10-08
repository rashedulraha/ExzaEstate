import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ProcurementQueryDto {
  @ApiPropertyOptional({ description: 'Filter by Project ID' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by Vendor ID' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Page limit', default: 50 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit = 50;

  @ApiPropertyOptional({ description: 'Page offset', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset = 0;
}
