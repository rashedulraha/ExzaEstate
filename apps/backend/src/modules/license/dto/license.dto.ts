import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateLicenseDto {
  @IsUUID()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  plan!: string;

  @IsISO8601()
  @IsNotEmpty()
  validUntil!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSeats!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxBranches?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxProjects?: number;

  @IsString()
  @IsOptional()
  machineId?: string;
}

export class VerifyLicenseDto {
  @IsUUID()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  licenseKey!: string;

  @IsString()
  @IsNotEmpty()
  signature!: string;

  @IsString()
  @IsOptional()
  machineId?: string;
}

export class HardwareFingerprintDto {
  @IsString()
  @IsOptional()
  motherboardSerial?: string;

  @IsString()
  @IsOptional()
  cpuId?: string;

  @IsString()
  @IsOptional()
  diskSerial?: string;
}

export class TransferLicenseDto {
  @IsUUID()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  licenseKey!: string;

  @IsString()
  @IsNotEmpty()
  newMachineId!: string;

  @IsObject()
  @IsOptional()
  previousHardware?: HardwareFingerprintDto;

  @IsObject()
  @IsOptional()
  newHardware?: HardwareFingerprintDto;

  @IsString()
  @IsOptional()
  reason?: string;
}
