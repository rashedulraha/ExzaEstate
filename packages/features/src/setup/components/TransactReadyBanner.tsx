import { CheckCircle2, AlertTriangle } from 'lucide-react';

export interface TransactReadyBannerProps {
  canTransact: boolean;
}

export function TransactReadyBanner({ canTransact }: TransactReadyBannerProps) {
  if (canTransact) {
    return (
      <div className="rounded-card border border-success/30 bg-success/10 p-4 flex items-start space-x-3">
        <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h4 className="text-body font-semibold text-success">Enterprise Ready to Transact</h4>
          <p className="text-body-sm text-text mt-0.5">
            All mandatory onboarding steps (fiscal year, head office branch, operational policies,
            numbering, and managing director access) are satisfied. The company can now create
            leads, execute bookings, and post accounting vouchers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-warning/30 bg-warning/10 p-4 flex items-start space-x-3">
      <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <h4 className="text-body font-semibold text-warning">Setup Action Required</h4>
        <p className="text-body-sm text-text mt-0.5">
          One or more mandatory setup requirements are incomplete. Complete all mandatory checklist
          items before initiating financial postings or property agreements.
        </p>
      </div>
    </div>
  );
}
