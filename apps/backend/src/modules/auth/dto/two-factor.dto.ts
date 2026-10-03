import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Enable2FaDto {
  @IsString()
  @IsNotEmpty()
  secret!: string;

  @IsString()
  @Length(6, 6)
  token!: string;
}

export class Disable2FaDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class StepUpDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
