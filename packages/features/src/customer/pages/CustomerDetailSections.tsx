import type { ReactElement } from 'react';
import { Button, StatusBadge } from '@exzaestate/ui';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { Phone, Mail, ShieldCheck, UserPlus, Users, FileText, Lock } from 'lucide-react';
import type {
  CustomerDetailRecord,
  CoBuyerItem,
  NomineeItem,
  CustomerDocumentItem,
} from '../hooks/useCustomerDetail.js';

export function CustomerProfileHeader({
  customer,
  onOpenKycModal,
}: {
  customer: CustomerDetailRecord;
  onOpenKycModal: () => void;
}): ReactElement {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-surface rounded-card border border-border shadow-xs">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/12 text-primary flex items-center justify-center font-bold text-h2">
          {customer.fullName.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h2 font-bold text-text">{customer.fullName}</h1>
            <span className="font-mono text-caption text-primary font-semibold px-2 py-0.5 rounded-full bg-primary/12 border border-primary/20">
              {customer.customerCode}
            </span>
            <StatusBadge value={customer.kycStatus} />
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-1.5 text-small text-text-muted">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {customer.phone}
            </span>
            {customer.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {customer.email}
              </span>
            )}
            {customer.occupation && (
              <span className="text-text-2 font-medium">{customer.occupation}</span>
            )}
          </div>
        </div>
      </div>

      <PermissionGate permission={PERMISSIONS.CUSTOMER_VERIFY_KYC}>
        <Button variant="secondary" className="gap-2 shrink-0" onClick={onOpenKycModal}>
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Audit KYC</span>
        </Button>
      </PermissionGate>
    </div>
  );
}

function getMaskedNidDisplay(customer: CustomerDetailRecord): string {
  if (customer.maskedNid) return customer.maskedNid;
  if (customer.nid) return `•••• •••• ••${customer.nid.slice(-4)}`;
  return '•••• •••• ••••';
}

function IdentitySection({ customer }: { customer: CustomerDetailRecord }): ReactElement {
  const maskedDisplay = getMaskedNidDisplay(customer);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-small text-text uppercase tracking-wide border-b border-border pb-2">
        Identity & KYC Information
      </h3>
      <div className="space-y-3 text-small">
        <div>
          <span className="text-caption text-text-muted block">Bangladeshi NID</span>
          <PermissionGate
            permission={PERMISSIONS.CUSTOMER_VIEW_PII}
            fallback={
              <span className="font-mono text-text-muted select-none flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-text-muted/60" />
                <span>{maskedDisplay}</span>
                <span className="text-caption text-text-muted/60 uppercase">(Masked PII)</span>
              </span>
            }
          >
            <span className="font-mono text-text font-semibold">{customer.nid || '—'}</span>
          </PermissionGate>
        </div>
        <div>
          <span className="text-caption text-text-muted block">TIN Certificate</span>
          <span className="font-mono text-text">{customer.tin || '—'}</span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">KYC Status</span>
          <div className="mt-0.5">
            <StatusBadge value={customer.kycStatus} />
          </div>
          {customer.kycRemarks && (
            <p className="text-caption text-text-2 mt-1 italic">Remark: {customer.kycRemarks}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DemographicsSection({ customer }: { customer: CustomerDetailRecord }): ReactElement {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-small text-text uppercase tracking-wide border-b border-border pb-2">
        Family & Demographics
      </h3>
      <div className="grid grid-cols-2 gap-3 text-small">
        <div>
          <span className="text-caption text-text-muted block">Father&apos;s Name</span>
          <span className="font-medium text-text">{customer.fatherName || '—'}</span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">Mother&apos;s Name</span>
          <span className="font-medium text-text">{customer.motherName || '—'}</span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">Spouse Name</span>
          <span className="font-medium text-text">{customer.spouseName || '—'}</span>
        </div>
        <div>
          <span className="text-caption text-text-muted block">Emergency Contact</span>
          <span className="font-medium text-text">{customer.emergencyContact || '—'}</span>
        </div>
        <div className="col-span-2">
          <span className="text-caption text-text-muted block">Primary Address</span>
          <p className="font-medium text-text mt-0.5">{customer.address || '—'}</p>
        </div>
      </div>
    </div>
  );
}

export function CustomerDetailsTab({ customer }: { customer: CustomerDetailRecord }): ReactElement {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-surface rounded-card border border-border">
      <IdentitySection customer={customer} />
      <DemographicsSection customer={customer} />
    </div>
  );
}

export function CustomerCoBuyersTab({
  coBuyers,
  onOpenAddModal,
}: {
  coBuyers: CoBuyerItem[];
  onOpenAddModal: () => void;
}): ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-small text-text">Registered Joint Buyers</h3>
        <Button variant="secondary" size="sm" className="gap-1.5" onClick={onOpenAddModal}>
          <UserPlus className="w-3.5 h-3.5 text-primary" />
          <span>Add Co-Buyer</span>
        </Button>
      </div>

      {coBuyers.length === 0 ? (
        <div className="p-8 text-center bg-surface rounded-card border border-border text-text-muted text-small">
          No joint buyers registered for this customer.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coBuyers.map((cb) => (
            <div key={cb.id} className="p-4 bg-surface rounded-card border border-border space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-small text-text">{cb.fullName}</h4>
                  <span className="text-caption text-text-muted">{cb.relation}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-primary/12 text-primary">
                  {cb.sharePercentage}% Share
                </span>
              </div>
              <div className="text-caption text-text-2 space-y-0.5">
                <p>Phone: {cb.phone}</p>
                <p className="font-mono">
                  NID: {cb.maskedNid ?? `•••• •••• ••${cb.nid.slice(-4)}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomerNomineesTab({
  nominees,
  onOpenAddModal,
}: {
  nominees: NomineeItem[];
  onOpenAddModal: () => void;
}): ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-small text-text">Legal Beneficiaries</h3>
        <Button variant="secondary" size="sm" className="gap-1.5" onClick={onOpenAddModal}>
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Add Nominee</span>
        </Button>
      </div>

      {nominees.length === 0 ? (
        <div className="p-8 text-center bg-surface rounded-card border border-border text-text-muted text-small">
          No legal nominees registered.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nominees.map((nom) => (
            <div
              key={nom.id}
              className="p-4 bg-surface rounded-card border border-border space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-small text-text">{nom.fullName}</h4>
                  <span className="text-caption text-text-muted">{nom.relation}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-success/12 text-success">
                  {nom.sharePercentage}% Share
                </span>
              </div>
              <div className="text-caption text-text-2 space-y-0.5">
                <p>Phone: {nom.phone}</p>
                <p className="font-mono">
                  NID: {nom.maskedNid ?? `•••• •••• ••${nom.nid.slice(-4)}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomerDocumentsTab({
  documents,
}: {
  documents: CustomerDocumentItem[];
}): ReactElement {
  if (documents.length === 0) {
    return (
      <div className="p-8 text-center bg-surface rounded-card border border-border text-text-muted text-small">
        No documents attached to this customer profile.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <div key={doc.id} className="p-4 bg-surface rounded-card border border-border space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="w-5 h-5" />
            <span className="font-semibold text-small text-text truncate">{doc.title}</span>
          </div>
          <span className="text-caption uppercase text-text-muted block">{doc.documentType}</span>
        </div>
      ))}
    </div>
  );
}
