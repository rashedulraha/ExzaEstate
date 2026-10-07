import { useState } from 'react';
import { Button, FormField, Input, StatusBadge } from '@exzaestate/ui';
import type { MigrationBatchItem, CreateBatchFormData } from '../schemas/migration.schema.js';

export interface MigrationBatchHeaderProps {
  batch: MigrationBatchItem | null;
  onCreateBatch: (data: CreateBatchFormData) => Promise<unknown>;
  isCreating: boolean;
}

export function MigrationBatchHeader({
  batch,
  onCreateBatch,
  isCreating,
}: MigrationBatchHeaderProps) {
  const [goLiveDate, setGoLiveDate] = useState('2026-07-01');
  const [notes, setNotes] = useState('Go-live cut-over migration from legacy ledgers');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateBatch({ goLiveDate, notes });
  };

  if (!batch) {
    return (
      <div className="rounded-card border border-border bg-surface p-6 space-y-4">
        <div>
          <h3 className="text-h3 font-semibold text-text">Initialize Go-Live Migration Batch</h3>
          <p className="text-body-sm text-text-muted mt-0.5">
            Set the enterprise cut-over date per FLOW-03. All historical postings prior to this date
            will be locked upon finalization.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Cut-Over / Go-Live Date"
              id="go-live-date"
              helperText="Date from which live accounting operations begin"
            >
              <Input
                id="go-live-date"
                type="date"
                value={goLiveDate}
                onChange={(e) => setGoLiveDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Migration Scope Notes" id="migration-notes">
              <Input
                id="migration-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cutover from Excel booking ledger"
              />
            </FormField>
          </div>

          <Button type="submit" variant="primary" isLoading={isCreating}>
            Initialize Migration Batch
          </Button>
        </form>
      </div>
    );
  }

  const isFinalized = Boolean(batch.finalizedAt);

  return (
    <div className="rounded-card border border-border bg-surface p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center space-x-3">
          <h3 className="text-h3 font-bold text-text">{batch.batchNumber}</h3>
          <StatusBadge value={isFinalized ? 'CONFIRMED' : 'RESERVED'} />
        </div>
        <p className="text-body-sm text-text-muted mt-1">
          Cut-Over Date: <span className="font-medium text-text">{batch.goLiveDate}</span>
          {batch.notes && ` • ${batch.notes}`}
        </p>
      </div>

      <div className="flex items-center space-x-4 text-body-sm">
        <div>
          <span className="text-text-muted">Legacy Bookings:</span>{' '}
          <span className="font-bold text-text">{batch.legacyBookingCount}</span>
        </div>
        <div>
          <span className="text-text-muted">Journal:</span>{' '}
          <span className="font-mono text-primary font-medium">
            {batch.openingJournalId ? 'POSTED' : 'PENDING'}
          </span>
        </div>
      </div>
    </div>
  );
}
