import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeadStatusHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  fromStatus?: string | null;

  @ApiProperty()
  toStatus!: string;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiPropertyOptional()
  changedById?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class LeadResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  leadNumber!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  lostReason?: string | null;

  @ApiPropertyOptional()
  interestNotes?: string | null;

  @ApiPropertyOptional()
  preferredProjectId?: string | null;

  @ApiPropertyOptional()
  preferredPropertyType?: string | null;

  @ApiPropertyOptional()
  budgetPaisa?: string | null;

  @ApiPropertyOptional()
  assignedToId?: string | null;

  @ApiPropertyOptional()
  branchId?: string | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiPropertyOptional()
  updatedById?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: [LeadStatusHistoryItemDto] })
  statusHistory?: LeadStatusHistoryItemDto[];
}

export class PaginatedLeadResponseDto {
  @ApiProperty({ type: [LeadResponseDto] })
  items!: LeadResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
