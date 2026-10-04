import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ReopenPeriodDto {
  @ApiProperty({
    description: 'Mandatory business justification for reopening a closed accounting period',
    example: 'Adjusting accruals and audit adjustment entries per external auditor instructions',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Reopen reason is mandatory' })
  @MinLength(5, { message: 'Reopen reason must be at least 5 characters long' })
  @MaxLength(500, { message: 'Reopen reason cannot exceed 500 characters' })
  reason!: string;
}
