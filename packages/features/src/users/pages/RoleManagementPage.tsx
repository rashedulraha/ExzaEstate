import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Users, ShieldCheck, Shield, Sliders, KeyRound } from 'lucide-react';
import { Button, Breadcrumbs, LoadingState, ErrorState } from '@exzaestate/ui';
import { useRoles } from '../hooks/useRoles.js';
import { RoleListTable } from '../components/RoleListTable.js';
import { RoleModal } from '../components/RoleModal.js';
import { RolePermissionsMatrix } from '../components/RolePermissionsMatrix.js';
import type { RoleItem } from '../schemas/role.schema.js';

export function RoleManagementPage() {
  const navigate = useNavigate();
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

  const kpis = useMemo(() => {
    const total = roles.length;
    let system = 0;
    let custom = 0;
    let totalGrants = 0;

    roles.forEach((r) => {
      if (r.isSystem) {
        system++;
      } else {
        custom++;
      }
      totalGrants += r.permissions?.length ?? 0;
    });

    return { total, system, custom, totalGrants };
  }, [roles]);

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
    <div className="container-page space-y-6">
      {/* Tier 1: Breadcrumbs, Title, Navigation Tabs & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'System & Admin' },
              { label: 'Security Roles' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-bold text-text">Security Roles & Permissions</h1>
            <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-text-2 border border-border">
              {kpis.total} {kpis.total === 1 ? 'Role' : 'Roles'}
            </span>
          </div>
          <p className="text-body text-text-muted mt-1">
            Manage employee roles, access permissions, and approval privileges across modules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented Tab Switcher between Users and Roles */}
          <div className="flex items-center bg-surface-sunken p-0.5 rounded-button border border-border">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-btn rounded-button text-text-muted hover:text-text cursor-pointer transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Employees</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-btn rounded-button bg-surface text-text shadow-xs cursor-default font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Security Roles</span>
            </button>
          </div>

          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setCloneSourceRole(null);
              setIsModalOpen(true);
            }}
          >
            Create Role
          </Button>
        </div>
      </div>

      {/* Tier 2: 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Total Roles
            </span>
            <Shield className="w-4 h-4 text-text-muted" />
          </div>
          <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
            {kpis.total}
          </span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              System Protected
            </span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <span className="text-hero-num font-bold text-primary mt-1.5 block tabular-nums">
            {kpis.system}
          </span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Custom Roles
            </span>
            <Sliders className="w-4 h-4 text-text-muted" />
          </div>
          <span className="text-hero-num font-bold text-text mt-1.5 block tabular-nums">
            {kpis.custom}
          </span>
        </div>

        <div className="card-stat">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted">
              Active Grants
            </span>
            <KeyRound className="w-4 h-4 text-text-muted" />
          </div>
          <span className="text-hero-num font-bold text-text-2 mt-1.5 block tabular-nums">
            {kpis.totalGrants}
          </span>
        </div>
      </div>

      {/* Tier 3: Roles Table with Search and Type Filters */}
      <RoleListTable
        roles={roles}
        onSelectRolePermissions={(r) => setEditingRolePermissions(r)}
        onCloneRole={(r) => {
          setCloneSourceRole(r);
          setIsModalOpen(true);
        }}
        onDeleteRole={(r) => deleteRole(r.id)}
        onCreateRole={() => {
          setCloneSourceRole(null);
          setIsModalOpen(true);
        }}
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
