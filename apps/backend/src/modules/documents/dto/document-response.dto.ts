import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentVersionResponseDto {
  @ApiProperty({ description: 'Version ID' })
  id!: string;

  @ApiProperty({ description: 'Version number', example: 1 })
  version!: number;

  @ApiProperty({ description: 'File key in storage' })
  fileKey!: string;

  @ApiProperty({ description: 'File name' })
  fileName!: string;

  @ApiProperty({ description: 'MIME content type' })
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes (as string)' })
  sizeBytes!: string;

  @ApiPropertyOptional({ description: 'File checksum' })
  checksum?: string | null;

  @ApiPropertyOptional({ description: 'Custom metadata' })
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'User ID of uploader' })
  uploadedById?: string | null;

  @ApiProperty({ description: 'Upload timestamp' })
  createdAt!: string;
}

export class DocumentResponseDto {
  @ApiProperty({ description: 'Document ID' })
  id!: string;

  @ApiProperty({ description: 'Company ID' })
  companyId!: string;

  @ApiProperty({ description: 'Document title' })
  title!: string;

  @ApiPropertyOptional({ description: 'Document description' })
  description?: string | null;

  @ApiProperty({ description: 'Polymorphic entity type' })
  entityType!: string;

  @ApiProperty({ description: 'Polymorphic entity ID' })
  entityId!: string;

  @ApiPropertyOptional({ description: 'Document category' })
  category?: string | null;

  @ApiProperty({ description: 'Whether file is sensitive/private' })
  isPrivate!: boolean;

  @ApiPropertyOptional({ description: 'Required permission to view' })
  requiredPermission?: string | null;

  @ApiProperty({ description: 'Current version number' })
  currentVersion!: number;

  @ApiPropertyOptional({ description: 'Expiration date (ISO 8601)' })
  expiresAt?: string | null;

  @ApiProperty({ description: 'Whether document has expired' })
  isExpired!: boolean;

  @ApiProperty({ description: 'Document status (ACTIVE, EXPIRED, ARCHIVED)' })
  status!: string;

  @ApiPropertyOptional({ description: 'User ID who created the document' })
  createdById?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: string;

  @ApiPropertyOptional({
    description: 'List of all versions for this document',
    type: [DocumentVersionResponseDto],
  })
  versions?: DocumentVersionResponseDto[];
}

export class PresignUploadResponseDto {
  @ApiProperty({ description: 'Presigned S3 PUT URL for direct client upload' })
  uploadUrl!: string;

  @ApiProperty({ description: 'Storage key where file should be stored' })
  fileKey!: string;

  @ApiProperty({ description: 'Expiration in seconds', example: 900 })
  expiresInSeconds!: number;
}

export class PresignDownloadResponseDto {
  @ApiProperty({ description: 'Presigned S3 GET URL for direct client download' })
  downloadUrl!: string;

  @ApiProperty({ description: 'File name' })
  fileName!: string;

  @ApiProperty({ description: 'MIME content type' })
  mimeType!: string;

  @ApiProperty({ description: 'Version of the downloaded document' })
  version!: number;

  @ApiProperty({ description: 'Expiration in seconds', example: 900 })
  expiresInSeconds!: number;
}
