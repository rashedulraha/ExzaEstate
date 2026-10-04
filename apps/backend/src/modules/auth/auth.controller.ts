import {
  Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Ip, Param, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ForbiddenException, UnauthorizedException } from '../../common/exceptions/app.exception.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ConfigService } from '../../config/config.service.js';
import { AuthService } from './auth.service.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { Disable2FaDto, Enable2FaDto, StepUpDto } from './dto/two-factor.dto.js';
import { RequestUnlockDto, UnlockDto } from './dto/unlock.dto.js';
import { TwoFactorService } from './two-factor.service.js';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  private validateWebCsrf(origin?: string): void {
    if (!origin) {
      throw new ForbiddenException('CSRF check failed: Origin header is required for Web client');
    }

    const allowed = this.configService.corsOrigins;
    if (!allowed.includes(origin) && !allowed.includes('*')) {
      throw new ForbiddenException('CSRF check failed: Origin not in allowed list');
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Headers('x-client') xClient: string = 'desktop',
    @Headers('origin') origin: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const isWeb = xClient.toLowerCase() === 'web';
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || ip || '127.0.0.1';

    const result = await this.authService.login(
      dto,
      isWeb ? 'web' : 'desktop',
      clientIp,
      userAgent,
    );

    if (isWeb) {
      this.validateWebCsrf(origin);

      res.cookie('refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: this.configService.isProduction,
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return {
        accessToken: result.tokens.accessToken,
        user: result.user,
        minSupportedClientVersion: this.configService.minSupportedClientVersion,
      };
    }

    return {
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: result.user,
      minSupportedClientVersion: this.configService.minSupportedClientVersion,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('x-client') xClient: string = 'desktop',
    @Headers('origin') origin: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const isWeb = xClient.toLowerCase() === 'web';
    let rawToken: string | undefined;

    if (isWeb) {
      this.validateWebCsrf(origin);
      rawToken = req.cookies?.refresh_token;
    } else {
      rawToken = dto.refreshToken;
    }

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokens = await this.authService.refresh(rawToken, ip, userAgent);

    if (isWeb) {
      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: this.configService.isProduction,
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return {
        accessToken: tokens.accessToken,
        minSupportedClientVersion: this.configService.minSupportedClientVersion,
      };
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      minSupportedClientVersion: this.configService.minSupportedClientVersion,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers('x-client') xClient: string = 'desktop',
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const isWeb = xClient.toLowerCase() === 'web';
    if (isWeb) {
      this.validateWebCsrf(origin);
      res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    }

    if (user?.sessionId) {
      await this.authService.logout(user.sessionId);
    }

    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-client') xClient: string = 'desktop',
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const isWeb = xClient.toLowerCase() === 'web';
    if (isWeb) {
      this.validateWebCsrf(origin);
      res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    }

    return this.authService.logoutAll(user.userId, user.companyId);
  }

  @Get('sessions')
  async listSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listSessions(user.userId, user.companyId, user.sessionId);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  async revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('id') sessionId: string) {
    return this.authService.revokeSession(user.userId, user.companyId, sessionId);
  }

  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const me = await this.authService.getMe(user.userId, user.companyId);
    return {
      ...me,
      minSupportedClientVersion: this.configService.minSupportedClientVersion,
    };
  }

  @Public()
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Headers('x-client') xClient: string = 'desktop',
    @Res({ passthrough: true }) res: Response,
  ) {
    const isWeb = xClient.toLowerCase() === 'web';
    const result = await this.authService.acceptInvitation(dto);

    if (isWeb) {
      res.cookie('refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: this.configService.isProduction,
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return {
        accessToken: result.tokens.accessToken,
        user: result.user,
        minSupportedClientVersion: this.configService.minSupportedClientVersion,
      };
    }

    return {
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: result.user,
      minSupportedClientVersion: this.configService.minSupportedClientVersion,
    };
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('request-unlock')
  @HttpCode(HttpStatus.OK)
  async requestUnlock(@Body() dto: RequestUnlockDto) {
    return this.authService.requestUnlock(dto.email);
  }

  @Public()
  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  async unlock(@Body() dto: UnlockDto) {
    return this.authService.unlock(dto);
  }

  @Post('2fa/generate')
  @HttpCode(HttpStatus.OK)
  async generate2Fa(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactorService.generate(user.userId, user.companyId);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  async enable2Fa(@CurrentUser() user: AuthenticatedUser, @Body() dto: Enable2FaDto) {
    return this.twoFactorService.enable(user.userId, user.companyId, dto.secret, dto.token);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  async disable2Fa(@CurrentUser() user: AuthenticatedUser, @Body() dto: Disable2FaDto) {
    return this.twoFactorService.disable(user.userId, user.companyId, dto.token);
  }

  @Post('step-up')
  @HttpCode(HttpStatus.OK)
  async stepUp(@CurrentUser() user: AuthenticatedUser, @Body() dto: StepUpDto) {
    return this.twoFactorService.verifyStepUp(
      user.userId,
      user.companyId,
      user.sessionId,
      dto.token,
    );
  }
}
