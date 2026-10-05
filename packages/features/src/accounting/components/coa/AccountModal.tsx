import { useState, useEffect, type FormEvent } from 'react';
import { Dialog, FormField, Input, Select, Button } from '@exzaestate/ui';
import {
  ACCOUNT_TYPES,
  PARTY_TYPES,
  type AccountFormInput,
  type AccountTreeItem,
  type AccountTypeEnum,
  type PartyTypeEnum,
} from '../../schemas/accounting.schema.js';

export interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormInput) => Promise<void>;
  initialAccount?: AccountTreeItem | null;
  parentAccount?: AccountTreeItem | null;
  isSubmitting?: boolean;
}

function getAccountModalTitle(
  isEditing: boolean,
  initialAccount?: AccountTreeItem | null,
  parentAccount?: AccountTreeItem | null,
): string {
  if (isEditing && initialAccount) {
    return `Edit Account: ${initialAccount.code}`;
  }
  if (parentAccount) {
    return `Add Child Account under ${parentAccount.code} · ${parentAccount.name}`;
  }
  return 'Create New General Ledger Account';
}

function validateAccountForm(code: string, name: string): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!code.trim() || !/^\d+$/.test(code)) {
    errs.code = 'Account code must be numeric digits';
  }
  if (!name.trim() || name.length < 2) {
    errs.name = 'Account name must be at least 2 characters';
  }
  return errs;
}

export function AccountModal({
  isOpen,
  onClose,
  onSubmit,
  initialAccount,
  parentAccount,
  isSubmitting = false,
}: AccountModalProps) {
  const isEditing = Boolean(initialAccount);
  const isSystem = Boolean(initialAccount?.system);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountTypeEnum>('ASSET');
  const [isGroup, setIsGroup] = useState(false);
  const [partyType, setPartyType] = useState<PartyTypeEnum | ''>('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialAccount) {
      setCode(initialAccount.code);
      setName(initialAccount.name);
      setType(initialAccount.type);
      setIsGroup(Boolean(initialAccount.isGroup));
      setPartyType(initialAccount.partyType || '');
      setDescription(initialAccount.description || '');
    } else {
      setCode('');
      setName('');
      setType(parentAccount?.type || 'ASSET');
      setIsGroup(false);
      setPartyType('');
      setDescription('');
    }
    setErrors({});
  }, [initialAccount, parentAccount, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors = validateAccountForm(code, name);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    await onSubmit({
      code: code.trim(),
      name: name.trim(),
      type,
      parentId: parentAccount?.id || initialAccount?.parentId || undefined,
      isGroup,
      partyType: partyType ? partyType : undefined,
      description: description.trim() || undefined,
    });

    onClose();
  };

  const title = getAccountModalTitle(isEditing, initialAccount, parentAccount);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Configure chart of accounts entity attributes and subledger mapping"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            data-testid="save-account-btn"
          >
            {isEditing ? 'Save Changes' : 'Create Account'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="account-form">
        <div className="grid grid-cols-2 gap-4">
          <FormField id="accountCode" label="Account Code" required error={errors.code}>
            <Input
              id="accountCode"
              placeholder="e.g. 1010"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isEditing || isSubmitting}
            />
          </FormField>

          <FormField id="accountType" label="Account Category" required>
            <Select
              id="accountType"
              value={type}
              options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
              onChange={(val) => setType(val as AccountTypeEnum)}
              disabled={isSystem || isSubmitting}
            />
          </FormField>
        </div>

        <FormField id="accountName" label="Account Title / Name" required error={errors.name}>
          <Input
            id="accountName"
            placeholder="e.g. Cash in Hand"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4 items-center">
          <FormField id="partyType" label="Subledger Party Type">
            <Select
              id="partyType"
              value={partyType}
              placeholder="None (Standard Account)"
              options={[
                { value: '', label: 'None (Standard Account)' },
                ...PARTY_TYPES.map((p) => ({ value: p, label: p })),
              ]}
              onChange={(val) => setPartyType(val as PartyTypeEnum | '')}
              disabled={isSystem || isSubmitting}
            />
          </FormField>

          <div className="pt-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="isGroup"
                type="checkbox"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
                disabled={isSystem || isSubmitting}
                className="w-4 h-4 rounded-button border-border text-primary focus:ring-focus"
              />
              <div>
                <span className="text-body font-medium text-text block">Summary Group</span>
                <span className="text-caption text-text-muted block">
                  Cannot hold direct journal lines
                </span>
              </div>
            </label>
          </div>
        </div>

        <FormField id="description" label="Description / Purpose">
          <Input
            id="description"
            placeholder="Optional guidance notes on when this account is used"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
