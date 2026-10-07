import { useState, useMemo } from 'react';
import { Search, X, ShieldCheck, Plus, Sliders, Shield, Copy, Trash2 } from 'lucide-react';
import {
  DataTable,
  type ColumnDef,
  Button,
  Select,
  EmptyState,
  StickyToolbar,
} from '@exzaestate/ui';
import type { RoleItem } from '../schemas/role.schema.js';

export interface RoleListTableProps {
  roles: RoleItem[];
  onSelectRolePermissions: (role: RoleItem) => void;
  onCloneRole: (role: RoleItem) => void;
  onDeleteRole: (role: RoleItem) => void;
  onCreateRole?: () => void;
  isMutating: boolean;
}

export function RoleListTable({
  roles,
  onSelectRolePermissions,
  onCloneRole,
  onDeleteRole,
  onCreateRole,
  isMutating,
}: RoleListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        r.name.toLowerCase().includes(term) ||
        r.code.toLowerCase().includes(term) ||
        (r.description && r.description.toLowerCase().includes(term));

      const matchesType =
        !typeFilter ||
        (typeFilter === 'SYSTEM' && r.isSystem) ||
        (typeFilter === 'CUSTOM' && !r.isSystem);

      return matchesSearch && matchesType;
    });
  }, [roles, searchTerm, typeFilter]);

  const hasActiveFilters = Boolean(searchTerm || typeFilter);

  const handleClearFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
  };

  const columns: ColumnDef<RoleItem>[] = useMemo(
    () => [
      {
        key: 'role',
        header: 'Role Identifier',
        sortable: true,
        render: (r) => (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                r.isSystem
                  ? 'bg-primary/15 text-primary border-primary/25'
                  : 'bg-surface-sunken text-text-muted border-border'
              }`}
              aria-hidden="true"
            >
              {r.isSystem ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-body font-semibold text-text truncate">{r.name}</span>
              <span className="text-caption font-mono text-primary truncate">{r.code}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        render: (r) => (
          <p className="text-small text-text-muted line-clamp-1 max-w-md">{r.description || '—'}</p>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        align: 'center',
        render: (r) => {
          if (r.isSystem) {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-semibold bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                System Role
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium bg-surface-sunken text-text-muted border border-border">
              <Sliders className="w-3.5 h-3.5 text-text-muted" />
              Custom Role
            </span>
          );
        },
      },
      {
        key: 'grants',
        header: 'Permissions',
        align: 'center',
        render: (r) => (
          <span className="text-caption font-medium text-text-2 px-2.5 py-0.5 rounded-full bg-surface-sunken border border-border">
            {r.permissions?.length ?? 0} Grants
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (r) => (
          <div
            className="flex items-center justify-end gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="secondary" size="sm" onClick={() => onSelectRolePermissions(r)}>
              Permissions
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Copy className="w-3.5 h-3.5" />}
              onClick={() => onCloneRole(r)}
            >
              Clone
            </Button>
            {!r.isSystem && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => onDeleteRole(r)}
                disabled={isMutating}
                className="hover:text-danger"
              >
                Delete
              </Button>
            )}
          </div>
        ),
      },
    ],
    [onSelectRolePermissions, onCloneRole, onDeleteRole, isMutating],
  );

  return (
    <div className="space-y-4">
      {/* Tier 3 Toolbar: Live Search & Type Filter */}
      <StickyToolbar>
        <div className="p-3.5 border border-border bg-surface rounded-card shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search roles by name, code, or description..."
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
            <div className="w-40">
              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'SYSTEM', label: 'System Protected' },
                  { value: 'CUSTOM', label: 'Custom Roles' },
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

      {/* Main DataTable */}
      <div className="card-workspace">
        <DataTable<RoleItem>
          columns={columns}
          data={filteredRoles}
          keyExtractor={(r) => r.id}
          className="border-none shadow-none"
          emptyState={
            hasActiveFilters ? (
              <EmptyState
                icon={<Search className="w-6 h-6" />}
                title="No Matching Roles Found"
                description="No security roles match your current search and type filters."
                dashedBorder
                actionLabel="Clear Filters"
                onAction={handleClearFilters}
              />
            ) : (
              <EmptyState
                icon={<Shield className="w-6 h-6" />}
                title="No Custom Roles Provisioned"
                description="Define custom operational roles to delegate granular permissions across modules."
                dashedBorder
                actionLabel="Create Custom Role"
                actionIcon={<Plus className="w-4 h-4" />}
                onAction={onCreateRole}
              />
            )
          }
        />
      </div>
    </div>
  );
}
