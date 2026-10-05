import { useState } from 'react';
import { Button, LoadingState, ErrorState } from '@exzaestate/ui';
import { useRoles } from '../hooks/useRoles.js';
import { RoleListTable } from '../components/RoleListTable.js';
import { RoleModal } from '../components/RoleModal.js';
import { RolePermissionsMatrix } from '../components/RolePermissionsMatrix.js';
import type { RoleItem } from '../schemas/role.schema.js';

export function RoleManagementPage() {
  const {
    roles,
    isLoading,
    isError,
    refetch,
    createRole,
    cloneRole,
    updateRolePermissions,
    deleteRole,
    isMutating,
  } = useRoles();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cloneSourceRole, setCloneSourceRole] = useState<RoleItem | null>(null);
  const [editingRolePermissions, setEditingRolePermissions] = useState<RoleItem | null>(null);

  if (isLoading) {
    return <LoadingState variant="table" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Roles"
        message="Unable to retrieve security roles catalog. Please retry."
        onRetry={() => refetch()}
      />
    );
  }

  if (editingRolePermissions) {
    return (
      <RolePermissionsMatrix
        role={editingRolePermissions}
        onSave={updateRolePermissions}
        onClose={() => setEditingRolePermissions(null)}
        isSaving={isMutating}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">Security Roles & Permissions</h1>
          <p className="text-body text-text-muted mt-1">
            Enterprise RBAC definitions, hierarchical approval grants, and module data scopes.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setCloneSourceRole(null);
            setIsModalOpen(true);
          }}
        >
          Create Custom Role
        </Button>
      </div>

      <RoleListTable
        roles={roles}
        onSelectRolePermissions={(r) => setEditingRolePermissions(r)}
        onCloneRole={(r) => {
          setCloneSourceRole(r);
          setIsModalOpen(true);
        }}
        onDeleteRole={(r) => deleteRole(r.id)}
        isMutating={isMutating}
      />

      <RoleModal
        isOpen={isModalOpen}
        cloneFrom={cloneSourceRole}
        onClose={() => {
          setIsModalOpen(false);
          setCloneSourceRole(null);
        }}
        onCreateRole={createRole}
        onCloneRole={cloneRole}
        isSubmitting={isMutating}
      />
    </div>
  );
}
