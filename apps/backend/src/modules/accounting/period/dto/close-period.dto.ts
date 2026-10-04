import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ClosePeriodDto {
  @ApiPropertyOptional({
    description: 'Optional closing remarks or notes',
    example: 'Monthly closing reconciliations completed',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
