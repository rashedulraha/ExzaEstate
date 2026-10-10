import { useMemo } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button, type ColumnDef } from '@exzaestate/ui';
import type { UserItem } from '../schemas/user.schema.js';

export function getUserInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function isUserActive(u: UserItem): boolean {
  return u.status === 'ACTIVE' || (u as unknown as { isActive?: boolean }).isActive === true;
}

export function isPrimaryOwner(u: UserItem): boolean {
  return Boolean(
    u.roles?.some(
      (r) =>
        r.code === 'MANAGING_DIRECTOR' ||
        r.code === 'OWNER' ||
        r.code === 'SUPER_ADMIN' ||
        r.name === 'MANAGING_DIRECTOR' ||
        r.name === 'Owner',
    ),
  );
}

export function useUserColumns({
  onEditUser,
  onToggleStatus,
  isMutating,
}: {
  onEditUser: (user: UserItem) => void;
  onToggleStatus: (user: UserItem) => void;
  isMutating: boolean;
}): ColumnDef<UserItem>[] {
  return useMemo(
    () => [
      {
        key: 'user',
        header: 'User Profile',
        sortable: true,
        render: (u) => {
          const initials = getUserInitials(u.fullName);
          const isOwner = isPrimaryOwner(u);
          return (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-caption shrink-0 border border-primary/20"
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-body font-semibold text-text truncate">{u.fullName}</span>
                  {isOwner && (
                    <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25">
                      Owner
                    </span>
                  )}
                </div>
                <span className="text-caption text-text-muted truncate">{u.email}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'roles',
        header: 'Assigned Roles',
        render: (u) => {
          if (!u.roles || u.roles.length === 0) {
            return <span className="text-caption text-text-disabled">No roles</span>;
          }
          return (
            <div className="flex flex-wrap gap-1.5">
              {u.roles.map((r) => (
                <span
                  key={r.id || r.code}
                  className="text-caption font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20"
                >
                  {r.name || r.code}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        key: 'branches',
        header: 'Branch Allocations',
        render: (u) => {
          const branchNames = u.branches?.map((b) => b.name).filter(Boolean);
          const display =
            branchNames && branchNames.length > 0 ? branchNames.join(', ') : 'Head Office';
          return <span className="text-small text-text-2">{display}</span>;
        },
      },
      {
        key: 'twoFactor',
        header: '2FA',
        align: 'center',
        render: (u) => {
          if (u.isTwoFactorEnabled) {
            return (
              <span
                className="inline-flex items-center gap-1 text-caption font-semibold text-success bg-success/12 px-2 py-0.5 rounded-full border border-success/30"
                title="Two-Factor Authentication is active"
              >
                <ShieldCheck className="w-3 h-3" />
                Active
              </span>
            );
          }
          return (
            <span
              className="inline-flex items-center gap-1 text-caption font-medium text-text-muted bg-surface-sunken px-2 py-0.5 rounded-full border border-border"
              title="Two-Factor Authentication not enrolled"
            >
              <ShieldAlert className="w-3 h-3 text-warning" />
              Off
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        render: (u) => {
          const active = isUserActive(u);
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-semibold border ${
                active
                  ? 'bg-success/12 text-success border-success/30'
                  : 'bg-void/12 text-text-muted border-border'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  active ? 'bg-success' : 'bg-text-disabled'
                }`}
              />
              {active ? 'Active' : 'Deactivated'}
            </span>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (u) => {
          const isOwner = isPrimaryOwner(u);
          if (isOwner) {
            return (
              <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-semibold bg-surface-sunken text-primary border border-primary/25"
                  title="Organization Owner account is permanently protected"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  Account Owner
                </span>
              </div>
            );
          }

          const active = isUserActive(u);
          return (
            <div
              className="flex items-center justify-end gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEditUser(u)}
                disabled={isMutating}
              >
                Edit Access
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleStatus(u)}
                disabled={isMutating}
                className={active ? 'hover:text-danger' : 'hover:text-success'}
              >
                {active ? 'Deactivate' : 'Reactivate'}
              </Button>
            </div>
          );
        },
      },
    ],
    [onEditUser, onToggleStatus, isMutating],
  );
}
