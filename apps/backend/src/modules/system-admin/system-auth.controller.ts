import { Body, Controller, Headers, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { InitialAdminRegisterDto, SystemLoginDto } from './dto/system-auth.dto.js';
import { SystemAuthService } from './system-auth.service.js';

@ApiTags('System Admin Authentication')
@Controller('system/auth')
export class SystemAuthController {
  constructor(private readonly systemAuthService: SystemAuthService) {}

  @Public()
  @Post('register-initial')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register the first Super Admin on the platform' })
  async registerInitialAdmin(@Body() dto: InitialAdminRegisterDto, @Ip() ipAddress: string) {
    return this.systemAuthService.registerInitialAdmin(dto, ipAddress);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super Admin login requiring mandatory 2FA' })
  async login(
    @Body() dto: SystemLoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.systemAuthService.login(dto, ipAddress, userAgent);
  }

  @Public()
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Setup mandatory 2FA for Super Admin' })
  async setupTwoFactor(@Headers('authorization') authHeader?: string) {
    return this.systemAuthService.setupTwoFactor(authHeader);
  }
}
