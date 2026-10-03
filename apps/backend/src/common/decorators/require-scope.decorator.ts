import { SetMetadata } from '@nestjs/common';
import type { DataScope } from '@exzaestate/shared';

export const REQUIRE_SCOPE_KEY = 'requireScope';

export const RequireScope = (scope?: DataScope) => SetMetadata(REQUIRE_SCOPE_KEY, scope ?? true);
