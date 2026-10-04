import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ReverseJournalDto {
  @ApiProperty({
    description: 'Mandatory reason for reversing the posted journal',
    example: 'Posting error: incorrect cost center allocation requested by audit team',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Reversal reason is mandatory' })
  @MinLength(5, { message: 'Reversal reason must be at least 5 characters long' })
  @MaxLength(500, { message: 'Reversal reason cannot exceed 500 characters' })
  reason!: string;
}
