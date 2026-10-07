import { useState, type ReactElement } from 'react';
import { Drawer, StatusBadge, Button, Select } from '@exzaestate/ui';
import { formatMoney, formatDate } from '@exzaestate/shared';
import {
  PhoneCall,
  Mail,
  CalendarPlus,
  ArrowRightCircle,
  MessageSquare,
  Copy,
  Check,
} from 'lucide-react';
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

const STAGE_LABELS: Record<string, string> = {
  NEW: 'New Inquiries',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  QUALIFIED: 'Qualified',
  SITE_VISIT: 'Site Visit',
  NEGOTIATION: 'In Negotiation',
  BOOKING: 'Booking Request',
  CUSTOMER: 'Converted',
  LOST: 'Lost',
};

const SOURCE_LABELS: Record<string, string> = {
  FACEBOOK: 'Facebook',
  GOOGLE: 'Google',
  NEWSPAPER: 'Newspaper',
  BILLBOARD: 'Billboard',
  REFERRAL: 'Referral',
  WALK_IN: 'Walk-in',
  FAIR: 'Fair / Expo',
  CALL_CENTER: 'Call Center',
  OTHER: 'Other',
};

function ContactChannelsSection({
  lead,
  rawPhone,
  copiedEmail,
  onCopyEmail,
}: {
  lead: LeadItem;
  rawPhone: string;
  copiedEmail: boolean;
  onCopyEmail: () => void;
}) {
  const sourceLabel = SOURCE_LABELS[lead.source] || lead.source;
  return (
    <div className="p-4 bg-surface-sunken/40 rounded-card border border-border space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-caption font-semibold text-text-muted uppercase tracking-wider block">
          Contact Channels
        </span>
        <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border uppercase">
          {sourceLabel}
        </span>
      </div>

      <div className="space-y-2.5">
        {/* Phone Channel with Call and WhatsApp actions */}
        <div className="flex items-center justify-between p-3 bg-surface rounded-button border border-border hover:border-border-strong transition-colors">
          <div className="min-w-0 pr-2">
            <span className="text-caption text-text-muted block">Direct Phone</span>
            <span className="text-small font-semibold text-text font-mono truncate block mt-0.5">
              {lead.phone}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={`tel:${lead.phone}`}
              title="Direct Call"
              className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-sunken rounded-button transition-colors cursor-pointer border border-transparent hover:border-border"
            >
              <PhoneCall className="w-3.5 h-3.5" />
            </a>
            <a
              href={`https://wa.me/${rawPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Chat on WhatsApp"
              className="p-1.5 text-text-muted hover:text-success hover:bg-surface-sunken rounded-button transition-colors cursor-pointer border border-transparent hover:border-border"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Email Channel */}
        <div className="flex items-center justify-between p-3 bg-surface rounded-button border border-border hover:border-border-strong transition-colors">
          <div className="min-w-0 flex-1 pr-2">
            <span className="text-caption text-text-muted block">Email Address</span>
            <span
              className="text-small font-medium text-text font-mono truncate block mt-0.5"
              title={lead.email || undefined}
            >
              {lead.email || '—'}
            </span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`mailto:${lead.email}`}
                title="Send Email"
                className="p-1.5 text-text-muted hover:text-info hover:bg-surface-sunken rounded-button transition-colors cursor-pointer border border-transparent hover:border-border"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={onCopyEmail}
                title={copiedEmail ? 'Copied to clipboard' : 'Copy Email'}
                className="p-1.5 text-text-muted hover:text-text hover:bg-surface-sunken rounded-button transition-colors cursor-pointer border border-transparent hover:border-border"
              >
                {copiedEmail ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Details: Preferred Type & Lead Source */}
      <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-border/60 text-small">
        <div className="min-w-0">
          <span className="text-caption text-text-muted block">Preferred Property</span>
          <p className="font-semibold text-text mt-0.5 truncate">{lead.preferredType || 'Any'}</p>
        </div>
        <div className="min-w-0">
          <span className="text-caption text-text-muted block">Source Channel</span>
          <p className="font-semibold text-text mt-0.5 truncate uppercase">{sourceLabel}</p>
        </div>
      </div>
    </div>
  );
}

function FinancialRequirementsSection({
  minPaisa,
  maxPaisa,
}: {
  minPaisa?: string | null;
  maxPaisa?: string | null;
}) {
  return (
    <div className="p-4 bg-surface-sunken/40 rounded-card border border-border space-y-3">
      <span className="text-caption font-semibold text-text-muted uppercase tracking-wider block">
        Investment Budget
      </span>
      <div className="grid grid-cols-2 gap-3 p-3 bg-surface rounded-button border border-border">
        <div className="min-w-0">
          <span className="text-caption font-medium text-text-muted block">Min Budget</span>
          <p className="font-mono font-semibold text-small text-text mt-1 truncate">
            {minPaisa ? formatMoney(BigInt(minPaisa)) : '—'}
          </p>
        </div>
        <div className="min-w-0">
          <span className="text-caption font-medium text-text-muted block">Max Budget</span>
          <p className="font-mono font-semibold text-small text-text mt-1 truncate">
            {maxPaisa ? formatMoney(BigInt(maxPaisa)) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LeadDrawer({
  lead,
  isOpen,
  onClose,
  onConvert,
  onAddFollowUp,
  onStatusChange,
}: LeadDrawerProps): ReactElement | null {
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!lead) return null;

  const currentStatus = (lead.status || 'NEW').toUpperCase() as LeadStatusEnum;
  const rawPhone = lead.phone.replace(/[^0-9]/g, '');

  const handleCopyEmail = () => {
    if (lead.email) {
      void navigator.clipboard?.writeText(lead.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={lead.fullName}
      subtitle={`Prospect ID: ${lead.id.slice(0, 8)}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Quick Stage Bar */}
        <div className="flex items-center justify-between p-3.5 bg-surface-sunken/40 rounded-card border border-border">
          <div>
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wider block">
              Pipeline Stage
            </span>
            <div className="mt-1">
              <StatusBadge domain="lead" value={currentStatus} />
            </div>
          </div>
          <div className="w-44">
            <Select
              id="change-lead-stage"
              inputSize="md"
              value={currentStatus}
              onChange={(val) => onStatusChange(lead.id, val as LeadStatusEnum)}
              options={LEAD_STATUSES.map((s) => ({ label: STAGE_LABELS[s] || s, value: s }))}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 gap-2 text-small font-medium"
            onClick={() => onAddFollowUp(lead)}
          >
            <CalendarPlus className="w-4 h-4 text-text-muted" />
            <span>Schedule Activity</span>
          </Button>
          {currentStatus !== 'CUSTOMER' && (
            <Button
              variant="primary"
              size="md"
              className="flex-1 gap-2 text-small font-semibold shadow-xs"
              onClick={() => onConvert(lead)}
            >
              <ArrowRightCircle className="w-4 h-4 text-on-action" />
              <span>Convert to Customer</span>
            </Button>
          )}
        </div>

        {/* Contact Channels */}
        <ContactChannelsSection
          lead={lead}
          rawPhone={rawPhone}
          copiedEmail={copiedEmail}
          onCopyEmail={handleCopyEmail}
        />

        {/* Financial Requirements */}
        <FinancialRequirementsSection
          minPaisa={lead.budgetMinPaisa}
          maxPaisa={lead.budgetMaxPaisa}
        />

        {/* Lead Notes */}
        {lead.notes && (
          <div className="p-4 bg-surface-sunken/40 rounded-card border border-border space-y-2">
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wider block">
              Notes & Requirements
            </span>
            <div className="p-3 bg-surface rounded-button border border-border">
              <p className="text-small text-text whitespace-pre-wrap leading-relaxed break-words">
                {lead.notes}
              </p>
            </div>
          </div>
        )}

        {/* Audit Details */}
        <div className="text-caption text-text-muted pt-2 border-t border-border/60 flex justify-between items-center font-mono">
          <span>Acquired: {formatDate(lead.createdAt, 'Asia/Dhaka')}</span>
          <span>Assigned: {lead.assignedTo?.fullName ?? 'Unassigned'}</span>
        </div>
      </div>
    </Drawer>
  );
}
