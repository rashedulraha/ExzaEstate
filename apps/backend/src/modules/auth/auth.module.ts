import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PERMISSION_RESOLVER, PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthController } from './auth.controller.js';
import { AuthLockoutService } from './auth-lockout.service.js';
import { AuthService } from './auth.service.js';
import { InvitationService } from './invitation.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { PermissionService } from './permission.service.js';
import { RoleController } from './role.controller.js';
import { RoleService } from './role.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';
import { TwoFactorService } from './two-factor.service.js';
import { UserAdminController } from './user-admin.controller.js';
import { UserAdminService } from './user-admin.service.js';
import { UserLifecycleService } from './user-lifecycle.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule],
  controllers: [AuthController, RoleController, UserAdminController],
  providers: [
    AuthService,
    SessionService,
    InvitationService,
    TokenService,
    AuthLockoutService,
    PasswordResetService,
    PermissionService,
    TwoFactorService,
    RoleService,
    UserAdminService,
    UserLifecycleService,
    {
      provide: PERMISSION_RESOLVER,
      useExisting: PermissionService,
    },
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    SessionService,
    InvitationService,
    TokenService,
    AuthLockoutService,
    PasswordResetService,
    PermissionService,
    TwoFactorService,
    RoleService,
    UserAdminService,
    UserLifecycleService,
    PERMISSION_RESOLVER,
    JwtAuthGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
