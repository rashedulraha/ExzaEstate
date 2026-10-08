import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RequestWaiverDto {
  @ApiPropertyOptional({
    example: '10000000',
    description: 'Amount to waive in paisa. If omitted, full remaining amount is waived.',
  })
  @IsOptional()
  @IsString()
  amountPaisa?: string;

  @ApiProperty({ example: 'Management approved discount/waiver for early bulk payment' })
  @IsString()
  reason!: string;
}

export class WaiverResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'WVR-2026-00001' })
  waiverNumber!: string;

  @ApiProperty()
  installmentId!: string;

  @ApiProperty({ example: '10000000' })
  amountPaisa!: string;

  @ApiProperty({ example: 'BDT 1,00,000.00' })
  amountFormatted!: string;

  @ApiProperty({ example: 'Approved' })
  status!: string;

  @ApiProperty()
  reason!: string;

  @ApiPropertyOptional()
  approvalId?: string | null;

  @ApiProperty()
  createdAt!: string;
}
