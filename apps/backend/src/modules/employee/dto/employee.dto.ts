import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'User ID linked to this employee profile' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Unique employee code within the company', example: 'EMP-001' })
  @IsString()
  @IsNotEmpty()
  employeeCode!: string;

  @ApiProperty({ description: 'Job designation', example: 'General Manager' })
  @IsString()
  @IsNotEmpty()
  designation!: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Supervisor employee ID' })
  @IsUUID()
  @IsOptional()
  supervisorId?: string;

  @ApiPropertyOptional({ description: 'Date of joining (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ description: 'Unique employee code within the company' })
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @ApiPropertyOptional({ description: 'Job designation' })
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsUUID()
  @IsOptional()
  branchId?: string | null;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsUUID()
  @IsOptional()
  departmentId?: string | null;

  @ApiPropertyOptional({ description: 'Supervisor employee ID' })
  @IsUUID()
  @IsOptional()
  supervisorId?: string | null;

  @ApiPropertyOptional({ description: 'Date of joining (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  joiningDate?: string | null;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class QueryEmployeesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Search term for name, code, designation' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by branch' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by supervisor' })
  @IsOptional()
  @IsUUID()
  supervisorId?: string;
}
