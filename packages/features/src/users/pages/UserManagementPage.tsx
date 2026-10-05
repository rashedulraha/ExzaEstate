import { useState } from 'react';
import { Button, LoadingState, ErrorState } from '@exzaestate/ui';
import { useUsers } from '../hooks/useUsers.js';
import { useRoles } from '../hooks/useRoles.js';
import { UserListTable } from '../components/UserListTable.js';
import { UserModal } from '../components/UserModal.js';
import { UserRoleBranchModal } from '../components/UserRoleBranchModal.js';
import type { UserItem } from '../schemas/user.schema.js';

export function UserManagementPage() {
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

  if (isLoadingUsers || isLoadingRoles) {
    return <LoadingState variant="table" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Users"
        message="Unable to retrieve employee accounts. Ensure administrative permissions are active."
        onRetry={() => refetch()}
      />
    );
  }

  const handleToggleStatus = async (u: UserItem) => {
    if (u.status === 'ACTIVE') {
      await deactivateUser(u.id);
    } else {
      await reactivateUser(u.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">Users & Credentials</h1>
          <p className="text-body text-text-muted mt-1">
            Manage company employee accounts, administrative access, branch allocations, and 2FA
            status.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
          Create User
        </Button>
      </div>

      <UserListTable
        users={users}
        onEditUser={(u) => setEditingUser(u)}
        onToggleStatus={handleToggleStatus}
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
