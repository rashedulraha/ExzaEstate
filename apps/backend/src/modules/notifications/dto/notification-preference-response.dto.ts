import { ApiProperty } from '@nestjs/swagger';

export class NotificationPreferenceResponseDto {
  @ApiProperty({ description: 'Domain event code', example: 'booking.confirmed' })
  eventCode!: string;

  @ApiProperty({ description: 'Event human-friendly name', example: 'Booking Confirmed' })
  eventName!: string;

  @ApiProperty({ description: 'Event category/module', example: 'booking' })
  module!: string;

  @ApiProperty({ description: 'Notification channel', example: 'IN_APP' })
  channel!: string;

  @ApiProperty({ description: 'Whether notification delivery is active', example: true })
  enabled!: boolean;
}
