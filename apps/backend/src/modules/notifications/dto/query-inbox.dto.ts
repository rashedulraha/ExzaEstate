import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryInboxDto {
  @ApiPropertyOptional({
    description: 'Filter by read status',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({
    description: 'Number of notifications to return (max 100)',
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 20))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Opaque base64url cursor token for next page',
    example: 'eyJvZmZzZXQiOjIwfQ',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
