import { useNavigate } from 'react-router';
import { Breadcrumbs } from '@exzaestate/ui';
import { AccountProfileSettings } from '../../settings/components/AccountProfileSettings.js';

export function ProfilePage() {
  const navigate = useNavigate();

  return (
    <div className="container-page space-y-6">
      {/* Tier 1: Breadcrumbs & Header */}
      <div>
        <Breadcrumbs
          items={[
            { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Workspace & Admin' },
            { label: 'My Profile & Account' },
          ]}
        />
        <div className="flex items-center gap-3 mt-1.5">
          <h1 className="text-h1 font-bold text-text">My Profile & Account</h1>
          <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-primary border border-primary/20">
            Authenticated
          </span>
        </div>
        <p className="text-body text-text-muted mt-1">
          Personal account identity, active session security, and authentication controls.
        </p>
      </div>

      <AccountProfileSettings />
    </div>
  );
}
