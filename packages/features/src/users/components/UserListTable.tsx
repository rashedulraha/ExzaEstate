import { useState, useMemo } from 'react';
import { Search, X, Plus, UserCheck } from 'lucide-react';
import {
  DataTable,
  Button,
  Select,
  EmptyState,
  FilteredEmptyState,
  StickyToolbar,
  Dialog,
} from '@exzaestate/ui';
import type { UserItem } from '../schemas/user.schema.js';
import { useUserColumns, isUserActive } from './user-columns.js';

export interface UserListTableProps {
  users: UserItem[];
  onEditUser: (user: UserItem) => void;
  onToggleStatus: (user: UserItem) => void;
  onCreateUser?: () => void;
  isMutating: boolean;
}

function matchesUserSearch(u: UserItem, term: string): boolean {
  if (!term) return true;
  const fields = [u.fullName, u.email, u.phone];
  return fields.some((f) => f?.toLowerCase().includes(term));
}

function matchesUserRole(u: UserItem, roleFilter: string): boolean {
  if (!roleFilter) return true;
  return Boolean(u.roles?.some((r) => r.code === roleFilter || r.name === roleFilter));
}

function matchesUserStatus(u: UserItem, statusFilter: string): boolean {
  if (!statusFilter) return true;
  const active = isUserActive(u);
  if (statusFilter === 'ACTIVE') return active;
  if (statusFilter === 'INACTIVE') return !active;
  return true;
}

export function UserListTable({
  users,
  onEditUser,
  onToggleStatus,
  onCreateUser,
  isMutating,
}: UserListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<{
    user: UserItem;
    action: 'DEACTIVATE' | 'REACTIVATE';
  } | null>(null);

  const availableRoleOptions = useMemo(() => {
    const roleMap = new Map<string, string>();
    users.forEach((u) => {
      u.roles?.forEach((r) => {
        if (r.code && !roleMap.has(r.code)) {
          roleMap.set(r.code, r.name || r.code);
        }
      });
    });
    return [
      { value: '', label: 'All Roles' },
      ...Array.from(roleMap.entries()).map(([code, name]) => ({
        value: code,
        label: name,
      })),
    ];
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      return (
        matchesUserSearch(u, term) &&
        matchesUserRole(u, roleFilter) &&
        matchesUserStatus(u, statusFilter)
      );
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const hasActiveFilters = Boolean(searchTerm || roleFilter || statusFilter);

  const handleClearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
  };

  const handleRequestToggleStatus = (u: UserItem) => {
    const active = isUserActive(u);
    setConfirmTarget({
      user: u,
      action: active ? 'DEACTIVATE' : 'REACTIVATE',
    });
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmTarget) return;
    const targetUser = confirmTarget.user;
    setConfirmTarget(null);
    await onToggleStatus(targetUser);
  };

  const columns = useUserColumns({
    onEditUser,
    onToggleStatus: handleRequestToggleStatus,
    isMutating,
  });

  return (
    <div className="rounded-card border border-border bg-surface shadow-xs">
      <StickyToolbar className="p-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by employee name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-8 text-small rounded-button bg-surface border border-border-input text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-focus"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-40 sm:w-44">
              <Select value={roleFilter} onChange={setRoleFilter} options={availableRoleOptions} />
            </div>

            <div className="w-36">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active Only' },
                  { value: 'INACTIVE', label: 'Inactive Only' },
                ]}
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-text-muted hover:text-text text-small whitespace-nowrap"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </StickyToolbar>

      {filteredUsers.length === 0 ? (
        <div className="p-6">
          {hasActiveFilters ? (
            <FilteredEmptyState
              title="No Matching Employees Found"
              description="No user accounts match your current search and role/status criteria."
              onResetFilters={handleClearFilters}
            />
          ) : (
            <EmptyState
              icon={<UserCheck className="w-8 h-8" />}
              title="No Employee Accounts Provisioned"
              description="Add your first employee to assign security roles, branch locations, and system credentials."
              dashedBorder
              actionLabel="Add Employee"
              actionVariant="secondary"
              actionIcon={<Plus className="w-4 h-4" />}
              onAction={onCreateUser}
            />
          )}
        </div>
      ) : (
        <DataTable<UserItem>
          columns={columns}
          data={filteredUsers}
          keyExtractor={(u) => u.id}
          embedded
          className="border-none shadow-none"
        />
      )}

      <Dialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        title={
          confirmTarget?.action === 'DEACTIVATE'
            ? 'Deactivate Employee Account'
            : 'Reactivate Employee Account'
        }
        description={
          confirmTarget?.action === 'DEACTIVATE'
            ? `Are you sure you want to deactivate ${confirmTarget.user.fullName}? Their access tokens will be invalidated immediately.`
            : `Reactivate login credentials and permissions for ${confirmTarget?.user.fullName}?`
        }
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmTarget?.action === 'DEACTIVATE' ? 'destructive' : 'primary'}
              size="sm"
              isLoading={isMutating}
              onClick={handleConfirmToggleStatus}
            >
              {confirmTarget?.action === 'DEACTIVATE' ? 'Deactivate Account' : 'Reactivate Account'}
            </Button>
          </div>
        }
      >
        <div className="py-2 text-small text-text-muted">
          {confirmTarget?.action === 'DEACTIVATE' ? (
            <p>
              The employee will be unable to log in to web, desktop, or mobile applications. You can
              reactivate this account at any time from this table.
            </p>
          ) : (
            <p>
              The employee will regain access to their assigned branches, modules, and role
              privileges upon their next sign-in.
            </p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
