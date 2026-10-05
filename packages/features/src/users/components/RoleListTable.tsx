import { Button, StatusBadge } from '@exzaestate/ui';
import type { RoleItem } from '../schemas/role.schema.js';

export interface RoleListTableProps {
  roles: RoleItem[];
  onSelectRolePermissions: (role: RoleItem) => void;
  onCloneRole: (role: RoleItem) => void;
  onDeleteRole: (role: RoleItem) => void;
  isMutating: boolean;
}

export function RoleListTable({
  roles,
  onSelectRolePermissions,
  onCloneRole,
  onDeleteRole,
  isMutating,
}: RoleListTableProps) {
  return (
    <div className="rounded-card border border-border bg-surface-elevated overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-sunken/40 text-caption font-semibold text-text-muted uppercase tracking-wider">
              <th className="py-3 px-4">Role Code</th>
              <th className="py-3 px-4">Display Name</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-center">Type</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-body-sm">
            {roles.map((r) => (
              <tr key={r.id} className="hover:bg-surface-sunken/20 transition-colors">
                <td className="py-3.5 px-4 font-mono font-medium text-primary">{r.code}</td>
                <td className="py-3.5 px-4 font-medium text-text">{r.name}</td>
                <td className="py-3.5 px-4 text-text-muted">{r.description || '—'}</td>
                <td className="py-3.5 px-4 text-center">
                  <StatusBadge value={r.isSystem ? 'CONFIRMED' : 'DRAFT'} />
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  <Button variant="secondary" size="sm" onClick={() => onSelectRolePermissions(r)}>
                    Permissions
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onCloneRole(r)}>
                    Clone
                  </Button>
                  {!r.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteRole(r)}
                      disabled={isMutating}
                    >
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
