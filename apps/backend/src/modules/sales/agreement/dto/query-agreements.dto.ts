import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryAgreementsDto {
  @ApiPropertyOptional({ description: 'Filter by booking ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (Draft, Generated, Signed & Locked, Superseded)',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Search term for agreement number or title' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number (default: 1)', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page limit (default: 20, max: 100)', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
