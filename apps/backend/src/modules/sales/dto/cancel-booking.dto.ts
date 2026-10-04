import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @ApiProperty({ description: 'Mandatory reason for cancellation' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({
    description: 'Target property status upon cancellation per policy (default Available)',
    enum: ['Available', 'Blocked'],
    default: 'Available',
  })
  @IsOptional()
  @IsIn(['Available', 'Blocked'])
  cancellationPolicyStatus?: 'Available' | 'Blocked';
}
