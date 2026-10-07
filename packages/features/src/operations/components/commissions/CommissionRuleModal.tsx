import { useState } from 'react';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import type {
  CreateCommissionRuleInput,
  CommissionCalcTypeEnum,
  CommissionTriggerEventEnum,
} from '../../schemas/operations.schema.js';

export interface CommissionRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateCommissionRuleInput) => Promise<void>;
  projects?: Array<{ id: string; name: string }>;
}

export function CommissionRuleModal({
  isOpen,
  onClose,
  onSubmit,
  projects = [],
}: CommissionRuleModalProps) {
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [calculationType, setCalculationType] =
    useState<CommissionCalcTypeEnum>('PERCENT_NET_PRICE');
  const [percentage, setPercentage] = useState('2.0');
  const [fixedAmountTaka, setFixedAmountTaka] = useState('');
  const [triggerEvent, setTriggerEvent] = useState<CommissionTriggerEventEnum>('ON_CONFIRMED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Rule name is required');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const fixedPaisa =
        calculationType === 'FIXED_AMOUNT' && fixedAmountTaka
          ? BigInt(Math.round(parseFloat(fixedAmountTaka) * 100)).toString()
          : undefined;

      await onSubmit({
        name: name.trim(),
        projectId: projectId || undefined,
        calculationType,
        percentage: calculationType !== 'FIXED_AMOUNT' ? parseFloat(percentage) : undefined,
        fixedAmountPaisa: fixedPaisa,
        triggerEvent,
        isActive: true,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create commission rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const projectOptions = [
    { label: 'All Projects (Company-wide default)', value: '' },
    ...projects.map((p) => ({ label: p.name, value: p.id })),
  ];

  const calcTypeOptions = [
    { label: '% of Net Property Price', value: 'PERCENT_NET_PRICE' },
    { label: '% of Customer Collected Amount', value: 'PERCENT_COLLECTED' },
    { label: 'Fixed Amount (BDT)', value: 'FIXED_AMOUNT' },
  ];

  const triggerOptions = [
    { label: 'Upon Booking Confirmation', value: 'ON_CONFIRMED' },
    { label: 'Upon Sales Agreement Execution', value: 'ON_AGREEMENT' },
    { label: 'Upon Minimum Down Payment Collection', value: 'ON_COLLECTION_PCT' },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Commission Policy Rule"
      description="Configure commission schedules, payout calculation mechanisms, and entitlement milestones."
      size="md"
    >
      {error && (
        <div className="mb-4 rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField id="rule-name" label="Rule Name" required>
          <Input
            id="rule-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard 2% Net Price on Confirmation"
          />
        </FormField>

        <FormField id="rule-project" label="Target Project (Optional)">
          <Select
            id="rule-project"
            value={projectId}
            onChange={(val) => setProjectId(val)}
            options={projectOptions}
          />
        </FormField>

        <FormField id="rule-calc-type" label="Calculation Type">
          <Select
            id="rule-calc-type"
            value={calculationType}
            onChange={(val) => setCalculationType(val as CommissionCalcTypeEnum)}
            options={calcTypeOptions}
          />
        </FormField>

        {calculationType === 'FIXED_AMOUNT' ? (
          <FormField id="rule-fixed-amount" label="Fixed Commission (BDT)" required>
            <Input
              id="rule-fixed-amount"
              type="number"
              step="1"
              min="1"
              required
              value={fixedAmountTaka}
              onChange={(e) => setFixedAmountTaka(e.target.value)}
              placeholder="e.g. 50000"
            />
          </FormField>
        ) : (
          <FormField id="rule-rate" label="Commission Rate (%)" required>
            <Input
              id="rule-rate"
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              required
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              placeholder="e.g. 2.5"
            />
          </FormField>
        )}

        <FormField id="rule-trigger" label="Trigger Milestone">
          <Select
            id="rule-trigger"
            value={triggerEvent}
            onChange={(val) => setTriggerEvent(val as CommissionTriggerEventEnum)}
            options={triggerOptions}
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Create Rule'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
