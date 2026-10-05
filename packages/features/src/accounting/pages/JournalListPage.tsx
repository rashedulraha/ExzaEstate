import { useState } from 'react';
import { Button, Input, Select } from '@exzaestate/ui';
import { usePermission } from '@exzaestate/app-core';
import { PERMISSIONS, formatMoney } from '@exzaestate/shared';
import { Plus, Search, ShieldCheck } from 'lucide-react';
import { useJournalList } from '../hooks/useJournalList.js';
import { useJournalEntry } from '../hooks/useJournalEntry.js';
import { useCoaTree } from '../hooks/useCoaTree.js';
import { JournalDataTable } from '../components/journals/JournalDataTable.js';
import { JournalDrawer } from '../components/journals/JournalDrawer.js';
import { JournalEntryModal } from '../components/journals/JournalEntryModal.js';
import { JournalReversalModal } from '../components/journals/JournalReversalModal.js';
import {
  JOURNAL_STATUSES,
  JOURNAL_TYPES,
  type JournalItem,
  type JournalStatusEnum,
  type JournalTypeEnum,
} from '../schemas/accounting.schema.js';

interface KpiCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  isMoney?: boolean;
}

function KpiCard({ label, value, highlight = false, isMoney = false }: KpiCardProps) {
  const displayVal = isMoney ? formatMoney(value.toString()) : value;
  return (
    <div className="p-4 rounded-card border border-border bg-surface flex flex-col justify-between">
      <span className="text-caption text-text-muted font-medium">{label}</span>
      <span
        className={`font-mono font-bold text-h3 mt-1 tabular-nums ${
          highlight ? 'text-primary' : 'text-text'
        }`}
      >
        {displayVal}
      </span>
    </div>
  );
}

export function JournalListPage() {
  const { hasPermission: canCreate } = usePermission(PERMISSIONS.JOURNAL_CREATE);
  const { filters, setFilters, items, kpis, isLoading, refetch } = useJournalList();
  const { accounts } = useCoaTree();
  const { saveDraft, createAndPost, postDraft, reverseJournal, isSubmitting } = useJournalEntry();

  const [selectedJournal, setSelectedJournal] = useState<JournalItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [journalToReverse, setJournalToReverse] = useState<JournalItem | null>(null);

  const handleViewJournal = (journal: JournalItem) => {
    setSelectedJournal(journal);
    setIsDrawerOpen(true);
  };

  const handleOpenReversal = (journal: JournalItem) => {
    setJournalToReverse(journal);
    setIsReversalModalOpen(true);
  };

  const handlePostDraft = async (journalId: string) => {
    await postDraft(journalId);
    refetch();
    setIsDrawerOpen(false);
  };

  return (
    <div className="space-y-6" data-testid="journal-list-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">Journal Vouchers</h1>
          <p className="text-small text-text-muted mt-1">
            General ledger journal vouchers, double-entry audit trail, and immutability controls.
          </p>
        </div>
        {canCreate && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="create-journal-btn"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Journal Voucher
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Posted Ledger Volume"
          value={kpis.totalPostedVolumePaisa}
          isMoney
          highlight
        />
        <KpiCard label="Draft Vouchers" value={kpis.countDraft} />
        <KpiCard label="In Review" value={kpis.countReview} />
        <KpiCard label="Posted Vouchers" value={kpis.countPosted} />
        <KpiCard label="Reversed Offsets" value={kpis.countReversed} />
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 rounded-card border border-border bg-surface flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            placeholder="Search voucher # or narration..."
            value={filters.search || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            prefixIcon={<Search className="w-4 h-4 text-text-muted" />}
          />
        </div>

        <div className="w-40">
          <Select
            value={filters.status || 'ALL'}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              ...JOURNAL_STATUSES.map((s) => ({ value: s, label: s })),
            ]}
            onChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                status: val as JournalStatusEnum | 'ALL',
              }))
            }
          />
        </div>

        <div className="w-40">
          <Select
            value={filters.type || 'ALL'}
            options={[
              { value: 'ALL', label: 'All Types' },
              ...JOURNAL_TYPES.map((t) => ({ value: t, label: t })),
            ]}
            onChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                type: val as JournalTypeEnum | 'ALL',
              }))
            }
          />
        </div>

        <div className="ml-auto text-caption text-text-muted flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>RULE-DOUBLE-ENTRY Enforced</span>
        </div>
      </div>

      {/* Journals Table */}
      <JournalDataTable journals={items} isLoading={isLoading} onViewJournal={handleViewJournal} />

      {/* Drawer */}
      <JournalDrawer
        journal={selectedJournal}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onPostDraft={handlePostDraft}
        onOpenReversal={handleOpenReversal}
      />

      {/* Create Modal */}
      <JournalEntryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        accounts={accounts}
        onSubmitDraft={async (data) => {
          await saveDraft(data);
          refetch();
        }}
        onSubmitPost={async (data) => {
          await createAndPost(data);
          refetch();
        }}
        isSubmitting={isSubmitting}
      />

      {/* Reversal Modal */}
      <JournalReversalModal
        isOpen={isReversalModalOpen}
        journal={journalToReverse}
        onClose={() => {
          setIsReversalModalOpen(false);
          setJournalToReverse(null);
        }}
        onSubmit={async (input) => {
          await reverseJournal(input);
          refetch();
          setIsDrawerOpen(false);
        }}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
