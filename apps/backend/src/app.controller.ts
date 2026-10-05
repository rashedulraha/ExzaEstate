import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RequestWithMetadata } from './common/logging/request-logging.middleware.js';
import { ConfigService } from './config/config.service.js';

export interface ApiRootData {
  message: string;
  status: string;
  version: string;
  requestId: string;
  timestamp: string;
  docs: string;
}

export interface ApiRootResult {
  data: ApiRootData;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Platform API v1 root information and status' })
  @ApiResponse({
    status: 200,
    description: 'API operational status, welcome message, and metadata',
  })
  getRoot(@Req() req: RequestWithMetadata): ApiRootResult {
    const requestId =
      req.requestId || req.id || (req.headers?.['x-request-id'] as string) || 'unknown';
    const timestamp = new Date().toISOString();

    return {
      data: {
        message: 'ExzaEstate Enterprise ERP API is operational',
        status: 'online',
        version: this.configService.minSupportedClientVersion || '0.1.0',
        requestId,
        timestamp,
        docs: '/api/docs',
      },
      meta: {
        requestId,
        timestamp,
      },
    };
  }
}
