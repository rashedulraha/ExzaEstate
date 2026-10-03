import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { SystemJwtAuthGuard } from './guards/system-jwt-auth.guard.js';
import { SystemHealthService } from './system-health.service.js';

@Controller('system/health')
@UseGuards(SystemJwtAuthGuard)
@Public()
export class SystemHealthController {
  constructor(private readonly healthService: SystemHealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    const data = await this.healthService.getPlatformHealthMetrics();
    return {
      success: true,
      data,
    };
  }
}
