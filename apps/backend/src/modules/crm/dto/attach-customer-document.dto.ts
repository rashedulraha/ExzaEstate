import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AttachCustomerDocumentDto {
  @ApiProperty({ description: 'Document title', example: 'NID Card Scan (Front & Back)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    description: 'Document category (e.g. NID, PASSPORT, TIN, NOMINEE_NID, POA, BANK_STATEMENT)',
    example: 'NID',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  category?: string;

  @ApiProperty({
    description: 'Storage file key (presigned S3 / storage key)',
    example: 'uploads/2026/nid_scan.pdf',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  fileKey!: string;

  @ApiProperty({ description: 'Original file name', example: 'nid_scan.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ description: 'MIME type of document', example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes', example: 1048576 })
  @IsNumber()
  @Min(1)
  sizeBytes!: number;

  @ApiPropertyOptional({ description: 'SHA-256 Checksum of the file' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  checksum?: string;
}
