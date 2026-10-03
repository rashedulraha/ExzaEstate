import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class OnboardTenantDto {
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Company code is required' })
  code!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  branchCode?: string;

  @IsNotEmpty({ message: 'Managing Director info is required' })
  managingDirector!: {
    email: string;
    fullName: string;
    password?: string;
    phone?: string;
    isLocalMode?: boolean;
  };
}

export class SuspendTenantDto {
  @IsString()
  @MinLength(5, { message: 'A suspension reason must be provided' })
  reason!: string;
}
