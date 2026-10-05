import { useState, useEffect } from 'react';
import { Dialog, Button } from '@exzaestate/ui';
import type { UserItem } from '../schemas/user.schema.js';
import type { RoleItem } from '../schemas/role.schema.js';

export interface UserRoleBranchModalProps {
  isOpen: boolean;
  user: UserItem | null;
  availableRoles: RoleItem[];
  onClose: () => void;
  onUpdateRoles: (userId: string, roleIds: string[]) => Promise<unknown>;
  isUpdating: boolean;
}

export function UserRoleBranchModal({
  isOpen,
  user,
  availableRoles,
  onClose,
  onUpdateRoles,
  isUpdating,
}: UserRoleBranchModalProps) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setSelectedRoleIds(user.roles?.map((r) => r.id) || []);
    }
  }, [user]);

  if (!user) return null;

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoleIds.length === 0) return;
    await onUpdateRoles(user.id, selectedRoleIds);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Access: ${user.fullName}`}
      description="Update security roles and permission scopes for this user account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-caption font-semibold text-text mb-2">Assigned Roles</label>
          <div className="space-y-2 border border-border rounded-card p-3 bg-surface-sunken/20 max-h-56 overflow-y-auto">
            {availableRoles.map((role) => (
              <label
                key={role.id}
                className="flex items-start space-x-3 p-2 rounded-card hover:bg-surface-sunken/40 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <div>
                  <div className="font-medium text-body-sm text-text">{role.name}</div>
                  {role.description && (
                    <div className="text-caption text-text-muted">{role.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isUpdating}
            disabled={selectedRoleIds.length === 0}
          >
            Save Access Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
