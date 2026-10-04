import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SignAndLockAgreementDto {
  @ApiPropertyOptional({
    description: 'ID of the uploaded signed document attachment',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({ description: 'Execution and signing remarks' })
  @IsString()
  @IsOptional()
  notes?: string;
}
