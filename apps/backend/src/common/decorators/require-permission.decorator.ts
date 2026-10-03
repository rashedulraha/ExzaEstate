import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@exzaestate/shared';

export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';

export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
