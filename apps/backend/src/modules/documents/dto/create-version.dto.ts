import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateVersionDto {
  @ApiProperty({
    description: 'S3 storage file key obtained from presign-upload',
    example: 'comp-uuid/documents/entity-uuid/rand-deed_v2.pdf',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  fileKey!: string;

  @ApiProperty({ description: 'File name with extension', example: 'deed_v2.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ description: 'MIME content type', example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes', example: 2048000 })
  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @ApiPropertyOptional({ description: 'File checksum (SHA-256 or MD5)' })
  @IsOptional()
  @IsString()
  checksum?: string;

  @ApiPropertyOptional({ description: 'Arbitrary custom metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
