import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import type { LandUnitFactors } from '@exzaestate/shared';

export class UpdateLandFactorsDto implements Partial<LandUnitFactors> {
  [key: string]: number | string | undefined;
  @ApiPropertyOptional({ example: 720, description: 'Square feet per Katha' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  katha?: number;

  @ApiPropertyOptional({ example: 435.6, description: 'Square feet per Decimal/Shotok' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  decimal?: number;

  @ApiPropertyOptional({ example: 14400, description: 'Square feet per Bigha' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  bigha?: number;

  @ApiPropertyOptional({ example: 43560, description: 'Square feet per Acre' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  acre?: number;
}
