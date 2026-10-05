import type { ReactElement } from 'react';
import { Drawer, StatusBadge, Button, Select } from '@exzaestate/ui';
import { formatMoney, formatDate } from '@exzaestate/shared';
import { Phone, Mail, CalendarPlus, ArrowRightCircle, User } from 'lucide-react';
import type { LeadItem } from '../hooks/useLeadList.js';
import { LEAD_STATUSES, type LeadStatusEnum } from '../schemas/crm.schema.js';

interface LeadDrawerProps {
  lead: LeadItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConvert: (lead: LeadItem) => void;
  onAddFollowUp: (lead: LeadItem) => void;
  onStatusChange: (leadId: string, status: LeadStatusEnum) => void;
}

export function LeadDrawer({
  lead,
  isOpen,
  onClose,
  onConvert,
  onAddFollowUp,
  onStatusChange,
}: LeadDrawerProps): ReactElement | null {
  if (!lead) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={lead.fullName}
      subtitle={`Prospect ID: ${lead.id.slice(0, 8)}`}
      size="md"
    >
      <div className="space-y-6">
        {/* Quick Stage Bar */}
        <div className="flex items-center justify-between p-3.5 bg-surface-sunken rounded-card border border-border">
          <div>
            <span className="text-caption text-text-muted">Pipeline Stage</span>
            <div className="mt-1">
              <StatusBadge domain="lead" value={lead.status} />
            </div>
          </div>
          <div className="w-44">
            <Select
              id="change-lead-stage"
              value={lead.status}
              onChange={(val) => onStatusChange(lead.id, val as LeadStatusEnum)}
              options={LEAD_STATUSES.map((s) => ({ label: s, value: s }))}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="flex-1 gap-2" onClick={() => onAddFollowUp(lead)}>
            <CalendarPlus className="w-4 h-4 text-primary" />
            <span>Schedule Activity</span>
          </Button>
          {lead.status.toUpperCase() !== 'CUSTOMER' && (
            <Button variant="primary" className="flex-1 gap-2" onClick={() => onConvert(lead)}>
              <ArrowRightCircle className="w-4 h-4 text-on-action" />
              <span>Convert to Customer</span>
            </Button>
          )}
        </div>

        {/* Contact Information */}
        <div className="p-4 bg-surface rounded-card border border-border space-y-3">
          <h4 className="font-semibold text-small text-text flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span>Contact Details</span>
          </h4>
          <div className="grid grid-cols-2 gap-3 text-small">
            <div>
              <span className="text-caption text-text-muted">Direct Phone</span>
              <p className="font-medium text-text mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-text-muted" />
                {lead.phone}
              </p>
            </div>
            <div>
              <span className="text-caption text-text-muted">Email</span>
              <p className="font-medium text-text mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-text-muted" />
                {lead.email || '—'}
              </p>
            </div>
            <div>
              <span className="text-caption text-text-muted">Lead Source</span>
              <p className="font-medium text-text mt-0.5 uppercase">{lead.source}</p>
            </div>
            <div>
              <span className="text-caption text-text-muted">Preferred Type</span>
              <p className="font-medium text-text mt-0.5">{lead.preferredType || 'Any'}</p>
            </div>
          </div>
        </div>

        {/* Financial Requirements */}
        <div className="p-4 bg-surface rounded-card border border-border space-y-3">
          <h4 className="font-semibold text-small text-text">Investment Budget</h4>
          <div className="grid grid-cols-2 gap-3 text-small">
            <div>
              <span className="text-caption text-text-muted">Min Budget</span>
              <p className="font-mono font-medium text-text mt-0.5">
                {lead.budgetMinPaisa ? formatMoney(BigInt(lead.budgetMinPaisa)) : '—'}
              </p>
            </div>
            <div>
              <span className="text-caption text-text-muted">Max Budget</span>
              <p className="font-mono font-medium text-text mt-0.5">
                {lead.budgetMaxPaisa ? formatMoney(BigInt(lead.budgetMaxPaisa)) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Lead Notes */}
        {lead.notes && (
          <div className="p-4 bg-surface rounded-card border border-border space-y-1.5">
            <span className="text-caption font-semibold text-text-muted uppercase">
              Notes & Requirements
            </span>
            <p className="text-small text-text-2 whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}

        {/* Audit Details */}
        <div className="text-caption text-text-muted pt-4 border-t border-border flex justify-between">
          <span>Acquired: {formatDate(lead.createdAt, 'Asia/Dhaka')}</span>
          <span>Assigned: {lead.assignedTo?.fullName ?? 'Unassigned'}</span>
        </div>
      </div>
    </Drawer>
  );
}
