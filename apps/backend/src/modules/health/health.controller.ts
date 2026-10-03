import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Platform health status' })
  @ApiResponse({
    status: 200,
    description: 'System is healthy',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
          },
        },
      },
    },
  })
  check(): { status: string } {
    return { status: 'ok' };
  }
}
