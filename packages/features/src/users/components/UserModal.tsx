import { useState } from 'react';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';
import type { CreateUserFormData } from '../schemas/user.schema.js';
import type { RoleItem } from '../schemas/role.schema.js';

export interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRoles: RoleItem[];
  onSubmit: (data: CreateUserFormData) => Promise<unknown>;
  isSubmitting: boolean;
}

export function UserModal({
  isOpen,
  onClose,
  availableRoles,
  onSubmit,
  isSubmitting,
}: UserModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [tempPassword, setTempPassword] = useState('ChangeMe123!');
  const [mustChangePassword, setMustChangePassword] = useState(true);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoleIds.length === 0) return;
    await onSubmit({
      fullName,
      email,
      phone: phone.trim() || undefined,
      roleIds: selectedRoleIds,
      temporaryPassword: tempPassword,
      mustChangePassword,
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New User"
      description="Add an employee or administrator with assigned roles and credentials."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Full Name" id="user-full-name">
            <Input
              id="user-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Tariq Ahmed"
              required
            />
          </FormField>

          <FormField label="Corporate Email" id="user-email">
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tariq@exzaestate.com"
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Phone Number" id="user-phone">
            <Input
              id="user-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+8801700000000"
            />
          </FormField>

          <FormField
            label="Temporary Password"
            id="user-temp-password"
            helperText="Min 8 chars, must contain digits"
          >
            <Input
              id="user-temp-password"
              type="password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              required
            />
          </FormField>
        </div>

        <div>
          <label className="block text-caption font-semibold text-text mb-2">
            Assign Roles (At least one required)
          </label>
          <div className="grid grid-cols-2 gap-2 border border-border rounded-card p-3 bg-surface-sunken/20 max-h-40 overflow-y-auto">
            {availableRoles.map((role) => (
              <label
                key={role.id}
                className="flex items-center space-x-2 text-body-sm text-text cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span>{role.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <span className="text-caption text-text-muted">
              Require password reset and mandatory 2FA enrollment upon first login
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            disabled={selectedRoleIds.length === 0}
          >
            Create User
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
