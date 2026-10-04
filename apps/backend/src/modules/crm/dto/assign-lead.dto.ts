import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AssignLeadDto {
  @ApiProperty({
    description: 'Target Sales Executive user UUID',
    example: '0192a000-0000-7000-8000-000000000002',
  })
  @IsUUID('all')
  @IsNotEmpty()
  assignedToId!: string;

  @ApiPropertyOptional({
    description: 'Optional branch UUID to re-assign branch context',
  })
  @IsUUID('all')
  @IsOptional()
  branchId?: string;
}
