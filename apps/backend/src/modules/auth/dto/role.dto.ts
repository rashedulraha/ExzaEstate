import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DATA_SCOPES, type DataScope } from '@exzaestate/shared';

const ALLOWED_SCOPES = [DATA_SCOPES.OWN, DATA_SCOPES.TEAM, DATA_SCOPES.BRANCH, DATA_SCOPES.ALL];

export class RolePermissionItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  permissionCode!: string;

  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_SCOPES)
  scope?: DataScope;
}

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'code must contain only uppercase letters, numbers, and underscores',
  })
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionItemDto)
  permissions?: RolePermissionItemDto[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class CloneRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'newCode must contain only uppercase letters, numbers, and underscores',
  })
  newCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  newName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionItemDto)
  permissions!: RolePermissionItemDto[];
}
