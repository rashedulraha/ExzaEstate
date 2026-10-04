import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAgreementDto {
  @ApiPropertyOptional({
    example: 'Revised Agreement for Allotment & Sale',
    description: 'Updated agreement title',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Updated legal agreement content' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Updated agreement terms' })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiPropertyOptional({ description: 'Operational or legal notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
