import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class PresignUploadDto {
  @ApiProperty({ description: 'File name with extension', example: 'land_deed.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ description: 'MIME content type', example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes', example: 1048576 })
  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @ApiProperty({ description: 'Polymorphic entity type', example: 'PROJECT' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  entityType!: string;

  @ApiProperty({
    description: 'Polymorphic entity ID',
    example: '01912345-6789-7abc-def0-123456789abc',
  })
  @IsUUID()
  entityId!: string;

  @ApiPropertyOptional({
    description: 'Flag whether file is stored in private/sensitive storage',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
