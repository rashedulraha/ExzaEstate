import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsString, ValidateNested } from 'class-validator';

export class UpdatePreferenceItemDto {
  @ApiProperty({ description: 'Domain event code', example: 'booking.confirmed' })
  @IsString()
  eventCode!: string;

  @ApiProperty({
    description: 'Notification channel',
    example: 'IN_APP',
    enum: ['IN_APP', 'EMAIL', 'SMS'],
  })
  @IsIn(['IN_APP', 'EMAIL', 'SMS'])
  channel!: string;

  @ApiProperty({
    description: 'Whether notifications for this channel and event are enabled',
    example: true,
  })
  @IsBoolean()
  enabled!: boolean;
}

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Array of preference overrides to upsert',
    type: [UpdatePreferenceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePreferenceItemDto)
  preferences!: UpdatePreferenceItemDto[];
}
