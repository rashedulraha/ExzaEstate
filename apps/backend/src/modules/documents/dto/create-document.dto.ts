import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    description: 'S3 storage file key obtained from presign-upload',
    example: 'comp-uuid/documents/entity-uuid/rand-land_deed.pdf',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  fileKey!: string;

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

  @ApiProperty({ description: 'Document title', example: 'Purbachal Land Deed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Detailed description of the document' })
  @IsOptional()
  @IsString()
  description?: string;

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
    description: 'Document category (e.g. DEED, NID, CONTRACT, MUTATION)',
    example: 'DEED',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({
    description: 'Flag whether file is sensitive/private',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({
    description: 'Optional specific permission required to access this document',
    example: 'audit:view-sensitive',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  requiredPermission?: string;

  @ApiPropertyOptional({
    description: 'Document expiration date (ISO 8601)',
    example: '2027-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'File checksum (SHA-256 or MD5)' })
  @IsOptional()
  @IsString()
  checksum?: string;

  @ApiPropertyOptional({ description: 'Arbitrary custom metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
