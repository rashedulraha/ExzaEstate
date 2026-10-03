import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PERMISSION_RESOLVER, PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthController } from './auth.controller.js';
import { AuthLockoutService } from './auth-lockout.service.js';
import { AuthService } from './auth.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { PermissionService } from './permission.service.js';
import { TokenService } from './token.service.js';
import { TwoFactorService } from './two-factor.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    AuthLockoutService,
    PasswordResetService,
    PermissionService,
    TwoFactorService,
    {
      provide: PERMISSION_RESOLVER,
      useExisting: PermissionService,
    },
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    AuthLockoutService,
    PasswordResetService,
    PermissionService,
    TwoFactorService,
    PERMISSION_RESOLVER,
    JwtAuthGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
