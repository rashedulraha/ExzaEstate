import { CheckCircle2, AlertTriangle } from 'lucide-react';

export interface TransactReadyBannerProps {
  canTransact: boolean;
}

export function TransactReadyBanner({ canTransact }: TransactReadyBannerProps) {
  if (canTransact) {
    return (
      <div className="rounded-card border border-success/30 bg-surface p-4 flex items-start space-x-3.5 shadow-xs">
        <div className="p-1 rounded-full bg-success/15 text-success shrink-0 mt-0.5">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-body font-semibold text-success">Enterprise Ready to Transact</h4>
          <p className="text-body-sm text-text-muted mt-0.5 leading-relaxed">
            All mandatory onboarding steps (fiscal year, head office branch, operational policies,
            numbering, and managing director access) are satisfied. The company can now create
            leads, execute bookings, and post accounting vouchers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-warning/30 bg-surface p-4 flex items-start space-x-3.5 shadow-xs">
      <div className="p-1 rounded-full bg-warning/15 text-warning shrink-0 mt-0.5">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <h4 className="text-body font-semibold text-warning">Setup Action Required</h4>
        <p className="text-body-sm text-text-muted mt-0.5 leading-relaxed">
          One or more mandatory setup requirements are incomplete. Complete all mandatory checklist
          items before initiating financial postings or property agreements.
        </p>
      </div>
    </div>
  );
}
