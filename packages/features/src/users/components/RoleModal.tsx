import { useState, useEffect } from 'react';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';
import type { RoleItem, CreateRoleFormData, CloneRoleFormData } from '../schemas/role.schema.js';

export interface RoleModalProps {
  isOpen: boolean;
  cloneFrom: RoleItem | null;
  onClose: () => void;
  onCreateRole: (data: CreateRoleFormData) => Promise<unknown>;
  onCloneRole: (sourceRoleId: string, data: CloneRoleFormData) => Promise<unknown>;
  isSubmitting: boolean;
}

export function RoleModal({
  isOpen,
  cloneFrom,
  onClose,
  onCreateRole,
  onCloneRole,
  isSubmitting,
}: RoleModalProps) {
  const isClone = Boolean(cloneFrom);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (cloneFrom) {
      setCode(`${cloneFrom.code}_COPY`);
      setName(`${cloneFrom.name} (Copy)`);
      setDescription(cloneFrom.description || '');
    } else {
      setCode('');
      setName('');
      setDescription('');
    }
  }, [cloneFrom, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClone && cloneFrom) {
      await onCloneRole(cloneFrom.id, {
        newCode: code.toUpperCase().replace(/\s+/g, '_'),
        newName: name,
        description: description.trim() || undefined,
      });
    } else {
      await onCreateRole({
        code: code.toUpperCase().replace(/\s+/g, '_'),
        name,
        description: description.trim() || undefined,
      });
    }
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isClone ? `Clone Role: ${cloneFrom?.name}` : 'Create Custom Role'}
      description={
        isClone
          ? 'Duplicate role permissions and scopes into a new security role.'
          : 'Define a custom security role for enterprise access delegation.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Role Code"
          id="role-code"
          helperText="Uppercase alphanumeric identifier (e.g. SITE_SUPERVISOR)"
        >
          <Input
            id="role-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SITE_SUPERVISOR"
            required
          />
        </FormField>

        <FormField label="Display Name" id="role-name">
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Site Supervisor"
            required
          />
        </FormField>

        <FormField label="Description" id="role-description">
          <Input
            id="role-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Operational scope and responsibility summary"
          />
        </FormField>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {isClone ? 'Clone Role' : 'Create Role'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
