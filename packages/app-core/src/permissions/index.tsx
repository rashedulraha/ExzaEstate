import { useMemo, type ReactNode, type ReactElement } from 'react';
import { NoPermissionState } from '@exzaestate/ui';
import { useAuth } from '../session/index.js';

export type PermissionScope = 'OWN' | 'TEAM' | 'BRANCH' | 'ALL';

const SCOPE_HIERARCHY: Record<PermissionScope, number> = {
  OWN: 1,
  TEAM: 2,
  BRANCH: 3,
  ALL: 4,
};

export interface PermissionCheckResult {
  hasPermission: boolean;
  scope: PermissionScope | undefined;
}

/**
 * Checks whether the current user holds the required permission (and optional minimum scope).
 */
export function usePermission(
  permission: string,
  requiredScope?: PermissionScope,
): PermissionCheckResult {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return { hasPermission: false, scope: undefined };
    }

    const hasBasePermission = user.permissions.includes(permission);
    if (!hasBasePermission) {
      return { hasPermission: false, scope: undefined };
    }

    const userScope = user.scopes[permission] as PermissionScope | undefined;

    if (!requiredScope) {
      return { hasPermission: true, scope: userScope };
    }

    if (!userScope) {
      // If no scope is specified for this permission, base permission grants access
      return { hasPermission: true, scope: undefined };
    }

    const userRank = SCOPE_HIERARCHY[userScope] ?? 0;
    const requiredRank = SCOPE_HIERARCHY[requiredScope] ?? 0;

    return {
      hasPermission: userRank >= requiredRank,
      scope: userScope,
    };
  }, [user, permission, requiredScope]);
}

export interface PermissionGateProps {
  permission: string;
  scope?: PermissionScope;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Declarative component gate that renders children only when the authenticated user holds the required permission.
 */
export function PermissionGate({
  permission,
  scope,
  fallback,
  children,
}: PermissionGateProps): ReactElement | null {
  const { hasPermission } = usePermission(permission, scope);

  if (!hasPermission) {
    if (fallback !== undefined) {
      return fallback === null ? null : <>{fallback}</>;
    }
    return <NoPermissionState permission={permission} onGoBack={() => window.history.back()} />;
  }

  return <>{children}</>;
}
