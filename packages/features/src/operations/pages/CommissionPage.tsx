import { useState } from 'react';
import { Plus, Award } from 'lucide-react';
import { Button } from '@exzaestate/ui';
import { useCommissions } from '../hooks/useCommissions.js';
import { BrokerDataTable } from '../components/commissions/BrokerDataTable.js';
import { CommissionDataTable } from '../components/commissions/CommissionDataTable.js';
import { BrokerModal } from '../components/commissions/BrokerModal.js';
import { CommissionRuleModal } from '../components/commissions/CommissionRuleModal.js';
import { CommissionPayModal } from '../components/commissions/CommissionPayModal.js';
import type {
  CommissionPayableItem,
  CreateBrokerInput,
  CreateCommissionRuleInput,
  PayCommissionInput,
} from '../schemas/operations.schema.js';

export function CommissionPage() {
  const [tab, setTab] = useState<'BROKERS' | 'COMMISSIONS'>('BROKERS');
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<CommissionPayableItem | null>(null);

  const {
    brokers = [],
    rules = [],
    commissions = [],
    isLoadingBrokers,
    refetchBrokers,
    createBroker,
    createRule,
    approveCommission,
    payCommission,
  } = useCommissions();

  const handleCreateBroker = async (input: CreateBrokerInput) => {
    await createBroker(input);
    refetchBrokers();
  };

  const handleCreateRule = async (input: CreateCommissionRuleInput) => {
    await createRule(input);
  };

  const handleApprove = async (id: string) => {
    await approveCommission(id);
    refetchBrokers();
  };

  const handlePay = async (input: PayCommissionInput) => {
    if (!selectedCommission) return;
    await payCommission(selectedCommission.id, input);
    refetchBrokers();
  };

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            <h1 className="text-h1 font-semibold text-text">Brokers & Commission Governance</h1>
          </div>
          <p className="mt-1 text-caption text-text-muted">
            Broker network incentives, milestone accruals, approval workflows, and clawbacks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-button border border-border bg-surface-sunken p-0.5">
            <button
              type="button"
              onClick={() => setTab('BROKERS')}
              className={`rounded-button px-3 py-1.5 text-btn cursor-pointer transition-colors ${
                tab === 'BROKERS'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Brokers ({brokers.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('COMMISSIONS')}
              className={`rounded-button px-3 py-1.5 text-btn cursor-pointer transition-colors ${
                tab === 'COMMISSIONS'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Payables Ledger
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => setIsRuleModalOpen(true)}
            leftIcon={<Award className="h-4 w-4 text-accent" />}
          >
            Rules ({rules.length})
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsBrokerModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Broker
          </Button>
        </div>
      </div>

      {tab === 'BROKERS' ? (
        <BrokerDataTable
          brokers={brokers}
          isLoading={isLoadingBrokers}
          onSelectBroker={() => setTab('COMMISSIONS')}
          onPayCommission={() => setTab('COMMISSIONS')}
          onCreateRule={() => setIsRuleModalOpen(true)}
        />
      ) : (
        <CommissionDataTable
          commissions={commissions}
          isLoading={false}
          onApprove={handleApprove}
          onPay={(c) => {
            setSelectedCommission(c);
            setIsPayModalOpen(true);
          }}
        />
      )}

      <BrokerModal
        isOpen={isBrokerModalOpen}
        onClose={() => setIsBrokerModalOpen(false)}
        onSubmit={handleCreateBroker}
      />

      <CommissionRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        onSubmit={handleCreateRule}
      />

      <CommissionPayModal
        isOpen={isPayModalOpen}
        onClose={() => {
          setIsPayModalOpen(false);
          setSelectedCommission(null);
        }}
        commission={selectedCommission}
        onSubmit={handlePay}
      />
    </div>
  );
}
