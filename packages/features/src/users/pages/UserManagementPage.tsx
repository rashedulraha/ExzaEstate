import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Users, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import { Button, Breadcrumbs, LoadingState, ErrorState } from '@exzaestate/ui';
import { useUsers } from '../hooks/useUsers.js';
import { useRoles } from '../hooks/useRoles.js';
import { UserListTable } from '../components/UserListTable.js';
import { UserModal } from '../components/UserModal.js';
import { UserRoleBranchModal } from '../components/UserRoleBranchModal.js';
import type { UserItem } from '../schemas/user.schema.js';

export function UserManagementPage() {
  const navigate = useNavigate();
  const {
    users,
    isLoading: isLoadingUsers,
    isError,
    refetch,
    createUser,
    deactivateUser,
    reactivateUser,
    updateUserRoles,
    isMutating,
  } = useUsers();

  const { roles, isLoading: isLoadingRoles } = useRoles();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const kpis = useMemo(() => {
    const total = users.length;
    let active = 0;
    let inactive = 0;
    let twoFa = 0;

    users.forEach((u) => {
      const isActive =
        u.status === 'ACTIVE' || (u as unknown as { isActive?: boolean }).isActive === true;
      if (isActive) {
        active++;
      } else {
        inactive++;
      }
      if (u.isTwoFactorEnabled) {
        twoFa++;
      }
    });

    return { total, active, inactive, twoFa };
  }, [users]);

  if (isLoadingUsers || isLoadingRoles) {
    return <LoadingState variant="table" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Users"
        message="Unable to load employee accounts. Please check your connection or permissions."
        onRetry={() => refetch()}
      />
    );
  }

  const handleToggleStatus = async (u: UserItem) => {
    const isActive =
      u.status === 'ACTIVE' || (u as unknown as { isActive?: boolean }).isActive === true;
    if (isActive) {
      await deactivateUser(u.id);
    } else {
      await reactivateUser(u.id);
    }
  };

  return (
    <div className="container-page space-y-6">
      {/* Tier 1: Breadcrumbs, Title, Navigation Tabs & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'System & Admin' },
              { label: 'Users & Roles' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-bold text-text">Users & Credentials</h1>
            <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {kpis.total} {kpis.total === 1 ? 'Account' : 'Accounts'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented Tab Switcher between Users and Roles */}
          <div className="flex items-center bg-surface-sunken p-0.5 rounded-button border border-border">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-btn rounded-button bg-surface text-text shadow-xs cursor-default font-medium"
            >
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Employees</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/roles')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-btn rounded-button text-text-muted hover:text-text cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Security Roles</span>
            </button>
          </div>

          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create User
          </Button>
        </div>
      </div>

      {/* Tier 2: 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Total Employees
            </span>
            <Users className="w-4 h-4 text-text-muted" />
          </div>
          <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
            {kpis.total}
          </span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Active Users
            </span>
            <UserCheck className="w-4 h-4 text-success" />
          </div>
          <span className="text-hero-num font-bold text-success mt-1.5 block tabular-nums">
            {kpis.active}
          </span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Inactive Users
            </span>
            <UserX className="w-4 h-4 text-text-muted" />
          </div>
          <span className="text-hero-num font-bold text-text-muted mt-1.5 block tabular-nums">
            {kpis.inactive}
          </span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Two-Factor Secured
            </span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <span className="text-hero-num font-bold text-primary mt-1.5 block tabular-nums">
            {kpis.twoFa}
          </span>
        </div>
      </div>

      {/* Tier 3: Users Table with Filters and Actions */}
      <UserListTable
        users={users}
        onEditUser={(u) => setEditingUser(u)}
        onToggleStatus={handleToggleStatus}
        onCreateUser={() => setIsCreateOpen(true)}
        isMutating={isMutating}
      />

      <UserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        availableRoles={roles}
        onSubmit={createUser}
        isSubmitting={isMutating}
      />

      <UserRoleBranchModal
        isOpen={Boolean(editingUser)}
        user={editingUser}
        availableRoles={roles}
        onClose={() => setEditingUser(null)}
        onUpdateRoles={updateUserRoles}
        isUpdating={isMutating}
      />
    </div>
  );
}
