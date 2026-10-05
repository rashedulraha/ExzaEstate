import { Button, StatusBadge } from '@exzaestate/ui';
import type { UserItem } from '../schemas/user.schema.js';

export interface UserListTableProps {
  users: UserItem[];
  onEditUser: (user: UserItem) => void;
  onToggleStatus: (user: UserItem) => void;
  isMutating: boolean;
}

export function UserListTable({
  users,
  onEditUser,
  onToggleStatus,
  isMutating,
}: UserListTableProps) {
  return (
    <div className="rounded-card border border-border bg-surface-elevated overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-sunken/40 text-caption font-semibold text-text-muted uppercase tracking-wider">
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Roles</th>
              <th className="py-3 px-4">Branches</th>
              <th className="py-3 px-4 text-center">2FA</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-body-sm">
            {users.map((u) => {
              const isActive = u.status === 'ACTIVE';
              return (
                <tr key={u.id} className="hover:bg-surface-sunken/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-text">{u.fullName}</div>
                    <div className="text-caption text-text-muted">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {u.roles?.map((r) => (
                        <span
                          key={r.id || r.code}
                          className="text-caption font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20"
                        >
                          {r.name || r.code}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-text-muted">
                    {u.branches?.map((b) => b.name).join(', ') || 'Head Office'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        u.isTwoFactorEnabled
                          ? 'bg-success'
                          : 'bg-surface-sunken border border-border'
                      }`}
                      title={u.isTwoFactorEnabled ? '2FA Enabled' : '2FA Disabled'}
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge value={isActive ? 'CONFIRMED' : 'REJECTED'} />
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
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
                    >
                      {isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
