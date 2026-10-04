import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class PostPaymentDto {
  @ApiPropertyOptional({ description: 'Posting date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  postingDate?: string;

  @ApiPropertyOptional({ description: 'Notes on posting' })
  @IsOptional()
  @IsString()
  notes?: string;
}
