import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SystemLoginDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;

  @IsOptional()
  @IsString()
  totpCode?: string;

  @IsOptional()
  @IsString()
  totpSecret?: string;
}

export class InitialAdminRegisterDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  password!: string;
}

export class VerifyTwoFactorDto {
  @IsString()
  @IsNotEmpty({ message: 'Setup token is required' })
  setupToken!: string;

  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  code!: string;
}
