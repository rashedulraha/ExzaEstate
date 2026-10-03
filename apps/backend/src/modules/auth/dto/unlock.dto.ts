import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestUnlockDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email!: string;
}

export class UnlockDto {
  @IsString({ message: 'Unlock token must be a string' })
  @IsNotEmpty({ message: 'Unlock token cannot be empty' })
  token!: string;

  @IsString({ message: 'TOTP code must be a string' })
  @IsNotEmpty({ message: 'TOTP code cannot be empty' })
  totpCode!: string;
}
