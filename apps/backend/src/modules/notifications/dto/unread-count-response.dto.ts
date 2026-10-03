import { ApiProperty } from '@nestjs/swagger';

export class UnreadCountResponseDto {
  @ApiProperty({ description: 'Total count of unread notifications', example: 5 })
  count!: number;
}
