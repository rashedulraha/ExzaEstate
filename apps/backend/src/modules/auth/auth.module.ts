import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthController } from './auth.controller.js';
import { AuthLockoutService } from './auth-lockout.service.js';
import { AuthService } from './auth.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, AuthLockoutService, PasswordResetService, JwtAuthGuard],
  exports: [AuthService, TokenService, AuthLockoutService, PasswordResetService, JwtAuthGuard],
})
export class AuthModule {}
