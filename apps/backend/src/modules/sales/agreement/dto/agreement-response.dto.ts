import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgreementTemplateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  companyId!: string;

  @ApiProperty({ example: 'ALLOTMENT_STD' })
  code!: string;

  @ApiProperty({ example: 'Standard Property Allotment Agreement' })
  name!: string;

  @ApiProperty()
  templateBody!: string;

  @ApiProperty({ example: true })
  isDefault!: boolean;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AgreementResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  companyId!: string;

  @ApiProperty({ example: 'AGR-2026-00001' })
  agreementNumber!: string;

  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  templateId?: string | null;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: 'Generated' })
  status!: string;

  @ApiProperty({ example: 'Agreement for Allotment & Sale' })
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiPropertyOptional()
  terms?: string | null;

  @ApiPropertyOptional()
  signedAt?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  signedById?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  documentId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  supersededById?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
