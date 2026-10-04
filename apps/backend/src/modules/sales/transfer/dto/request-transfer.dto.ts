import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RequestTransferDto {
  @ApiProperty({ description: 'Original Booking ID (UUID)' })
  @IsUUID()
  @IsNotEmpty()
  originalBookingId!: string;

  @ApiProperty({ description: 'Transferee (New) Customer ID (UUID)' })
  @IsUUID()
  @IsNotEmpty()
  transfereeCustomerId!: string;

  @ApiPropertyOptional({ description: 'Transfer fee in paisa', default: '0' })
  @IsString()
  @IsOptional()
  transferFeePaisa?: string;

  @ApiPropertyOptional({ description: 'Reason for booking transfer' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Execute transfer immediately', default: true })
  @IsBoolean()
  @IsOptional()
  executeImmediately?: boolean;
}
