import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PropertyHierarchyBlockDto {
  @ApiProperty({ description: 'Block UUID' })
  id!: string;

  @ApiProperty({ description: 'Block code' })
  code!: string;

  @ApiProperty({ description: 'Block name' })
  name!: string;
}

export class PropertyHierarchyFloorDto {
  @ApiProperty({ description: 'Floor UUID' })
  id!: string;

  @ApiProperty({ description: 'Floor code' })
  code!: string;

  @ApiProperty({ description: 'Floor name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Floor number index' })
  floorNumber!: number | null;
}

export class PropertyResponseDto {
  @ApiProperty({ description: 'Property UUID' })
  id!: string;

  @ApiProperty({ description: 'Company UUID' })
  companyId!: string;

  @ApiProperty({ description: 'Project UUID' })
  projectId!: string;

  @ApiPropertyOptional({ description: 'Block UUID' })
  blockId!: string | null;

  @ApiPropertyOptional({ description: 'Floor UUID' })
  floorId!: string | null;

  @ApiProperty({ description: 'Unit code' })
  code!: string;

  @ApiPropertyOptional({ description: 'Title' })
  title!: string | null;

  @ApiProperty({ description: 'Property type' })
  type!: string;

  @ApiProperty({ description: 'Property status' })
  status!: string;

  @ApiProperty({ description: 'Area in square feet' })
  areaSqft!: string;

  @ApiPropertyOptional({ description: 'Facing direction' })
  facing!: string | null;

  @ApiProperty({ description: 'Base price in integer paisa' })
  basePricePaisa!: string;

  @ApiProperty({ description: 'Premium price in integer paisa' })
  premiumPaisa!: string;

  @ApiProperty({ description: 'Discount limit percentage' })
  discountLimitPct!: string;

  @ApiProperty({ description: 'Net price in integer paisa' })
  netPricePaisa!: string;

  @ApiProperty({ description: 'Owner type' })
  ownerType!: string;

  @ApiPropertyOptional({ description: 'Hold expiry timestamp' })
  holdExpiresAt!: string | null;

  @ApiPropertyOptional({ description: 'Block reason' })
  blockReason!: string | null;

  @ApiPropertyOptional({ description: 'Description' })
  description!: string | null;

  @ApiPropertyOptional({ description: 'Metadata' })
  metadata!: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Linked block details', type: PropertyHierarchyBlockDto })
  block?: PropertyHierarchyBlockDto | null;

  @ApiPropertyOptional({ description: 'Linked floor details', type: PropertyHierarchyFloorDto })
  floor?: PropertyHierarchyFloorDto | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: string;
}

export class PropertyStatusHistoryResponseDto {
  @ApiProperty({ description: 'History log UUID' })
  id!: string;

  @ApiProperty({ description: 'Property UUID' })
  propertyId!: string;

  @ApiPropertyOptional({ description: 'Previous status' })
  fromStatus!: string | null;

  @ApiProperty({ description: 'New status' })
  toStatus!: string;

  @ApiPropertyOptional({ description: 'Reason for transition' })
  reason!: string | null;

  @ApiPropertyOptional({ description: 'User UUID who performed transition' })
  changedById!: string | null;

  @ApiPropertyOptional({ description: 'Extra context metadata' })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ description: 'Timestamp of status transition' })
  createdAt!: string;
}

export class PaginatedPropertyResponseDto {
  @ApiProperty({ type: [PropertyResponseDto] })
  items!: PropertyResponseDto[];

  @ApiProperty({ description: 'Total matching items' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Page limit' })
  limit!: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages!: number;
}
