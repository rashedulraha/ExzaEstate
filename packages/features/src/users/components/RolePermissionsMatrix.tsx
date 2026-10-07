import { useState, useEffect } from 'react';
import { Button, Select } from '@exzaestate/ui';
import type { RoleItem, RolePermissionItem } from '../schemas/role.schema.js';

export interface RolePermissionsMatrixProps {
  role: RoleItem | null;
  onSave: (roleId: string, permissions: RolePermissionItem[]) => Promise<unknown>;
  onClose: () => void;
  isSaving: boolean;
}

interface PermissionDefinition {
  code: string;
  name: string;
  isScoped?: boolean;
}

interface ModuleGroup {
  name: string;
  permissions: PermissionDefinition[];
}

const MODULE_PERMISSIONS: ModuleGroup[] = [
  {
    name: 'Property Inventory',
    permissions: [
      { code: 'property:view', name: 'View Units & Plots', isScoped: true },
      { code: 'property:create', name: 'Create Property' },
      { code: 'property:edit', name: 'Edit Property Details' },
      { code: 'property:override-status', name: 'Override Unit Status' },
    ],
  },
  {
    name: 'CRM & Customers',
    permissions: [
      { code: 'lead:view', name: 'View Leads', isScoped: true },
      { code: 'lead:create', name: 'Create Lead' },
      { code: 'customer:view', name: 'View Customer 360', isScoped: true },
      { code: 'customer:view-pii', name: 'View Masked NID/Bank PII' },
    ],
  },
  {
    name: 'Sales & Bookings',
    permissions: [
      { code: 'quotation:create', name: 'Create Quotation' },
      { code: 'booking:create', name: 'Submit Booking Request' },
      { code: 'discount:approve-tier1', name: 'Approve Discount Tier 1 (<= 2%)' },
      { code: 'discount:approve-tier2', name: 'Approve Discount Tier 2 (<= 5%)' },
      { code: 'discount:approve-tier3', name: 'Approve Discount Tier 3 (> 5%)' },
      { code: 'agreement:lock', name: 'Sign & Lock Agreement' },
    ],
  },
  {
    name: 'Collections & Payments',
    permissions: [
      { code: 'payment:create-draft', name: 'Draft Booking Payment' },
      { code: 'payment:post', name: 'Post Payment & Issue Receipt' },
      { code: 'payment:refund', name: 'Process Booking Refund' },
      { code: 'payment:reverse', name: 'Reverse Posted Payment' },
    ],
  },
  {
    name: 'Accounting Core',
    permissions: [
      { code: 'coa:view', name: 'View Chart of Accounts' },
      { code: 'journal:post', name: 'Post Manual Journal' },
      { code: 'period:close', name: 'Close Fiscal Period' },
      { code: 'period:reopen', name: 'Reopen Period (Audited)' },
    ],
  },
  {
    name: 'Administration & System',
    permissions: [
      { code: 'user:manage', name: 'Manage Users & Invites' },
      { code: 'role:manage', name: 'Manage Security Roles' },
      { code: 'settings:manage', name: 'Manage Company Policies' },
      { code: 'audit:view', name: 'View Audit & Security Logs' },
    ],
  },
];

export function RolePermissionsMatrix({
  role,
  onSave,
  onClose,
  isSaving,
}: RolePermissionsMatrixProps) {
  const [selectedPerms, setSelectedPerms] = useState<
    Map<string, 'OWN' | 'TEAM' | 'BRANCH' | 'ALL' | undefined>
  >(new Map());

  useEffect(() => {
    if (role?.permissions) {
      const map = new Map<string, 'OWN' | 'TEAM' | 'BRANCH' | 'ALL' | undefined>();
      role.permissions.forEach((p) => {
        map.set(p.permissionCode, p.scope);
      });
      setSelectedPerms(map);
    } else {
      setSelectedPerms(new Map());
    }
  }, [role]);

  if (!role) return null;

  const togglePermission = (code: string, isScoped?: boolean) => {
    setSelectedPerms((prev) => {
      const next = new Map(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.set(code, isScoped ? 'ALL' : undefined);
      }
      return next;
    });
  };

  const setScope = (code: string, scope: 'OWN' | 'TEAM' | 'BRANCH' | 'ALL') => {
    setSelectedPerms((prev) => {
      const next = new Map(prev);
      next.set(code, scope);
      return next;
    });
  };

  const handleSave = async () => {
    const list: RolePermissionItem[] = [];
    selectedPerms.forEach((scope, permissionCode) => {
      list.push({ permissionCode, scope });
    });
    await onSave(role.id, list);
    onClose();
  };

  return (
    <div className="rounded-card border border-border bg-surface p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
        <div>
          <h3 className="text-h3 font-semibold text-text">
            Permission Matrix: <span className="text-primary">{role.name}</span>
          </h3>
          <p className="text-body-sm text-text-muted mt-0.5">
            Configure granular capability grants and data access scopes for this role.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Back to Roles
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
            Save Permissions
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {MODULE_PERMISSIONS.map((group) => (
          <div key={group.name} className="border border-border rounded-card overflow-hidden">
            <div className="bg-surface-sunken/40 px-4 py-2.5 font-semibold text-label text-text border-b border-border">
              {group.name}
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.permissions.map((perm) => {
                const isChecked = selectedPerms.has(perm.code);
                const scope = selectedPerms.get(perm.code) || 'ALL';

                return (
                  <div
                    key={perm.code}
                    className="flex items-center justify-between p-3 rounded-card border border-border bg-surface-sunken/10 hover:bg-surface-sunken/30 transition-colors"
                  >
                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(perm.code, perm.isScoped)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <div>
                        <div className="font-medium text-body-sm text-text">{perm.name}</div>
                        <div className="font-mono text-caption text-text-muted">{perm.code}</div>
                      </div>
                    </label>

                    {perm.isScoped && isChecked && (
                      <div className="w-32">
                        <Select
                          value={scope}
                          onChange={(val) =>
                            setScope(perm.code, val as 'OWN' | 'TEAM' | 'BRANCH' | 'ALL')
                          }
                          options={[
                            { value: 'ALL', label: 'ALL Scope' },
                            { value: 'BRANCH', label: 'BRANCH' },
                            { value: 'TEAM', label: 'TEAM' },
                            { value: 'OWN', label: 'OWN Scope' },
                          ]}
                          inputSize="md"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
