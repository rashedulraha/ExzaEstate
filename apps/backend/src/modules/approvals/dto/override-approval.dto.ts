import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class OverrideApprovalDto {
  @ApiPropertyOptional({
    description: 'Mandatory justification for joint override (MD or GM)',
    example: 'Joint management executive override due to urgent director signoff.',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Alias for reason',
    example: 'Joint management executive override due to urgent director signoff.',
  })
  @IsString()
  @IsOptional()
  overrideReason?: string;
}
