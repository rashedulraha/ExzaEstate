import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class QueryUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  branchIds?: string[];
}

export class CreateUserAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  roleIds!: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  branchIds?: string[];

  @IsOptional()
  @IsUUID()
  defaultBranchId?: string;

  @IsString()
  @MinLength(8)
  temporaryPassword!: string;

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean = true;
}

export class UpdateUserRolesDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  roleIds!: string[];
}

export class UserBranchAssignmentDto {
  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateUserBranchesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserBranchAssignmentDto)
  branches!: UserBranchAssignmentDto[];
}

export class AdminResetPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  temporaryPassword?: string;
}
