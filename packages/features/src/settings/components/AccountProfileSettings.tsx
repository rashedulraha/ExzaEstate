import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, LogIn, ShieldAlert } from 'lucide-react';
import { useAuth } from '@exzaestate/app-core';
import { cleanEnglishText } from '@exzaestate/shared';
import { useTheme } from '@exzaestate/ui';
import { SignOutModal } from '../../auth/components/SignOutModal.js';
import {
  ProfileIdentityCard,
  ThemeSelectorCard,
  AccountSecurityCard,
} from './AccountProfileComponents.js';

interface SessionActionsCardProps {
  onSignOut: () => void;
  onSwitchAccount: () => void;
  onSignOutAll: () => void;
  isProcessing: boolean;
}

function SessionActionsCard({
  onSignOut,
  onSwitchAccount,
  onSignOutAll,
  isProcessing,
}: SessionActionsCardProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div>
          <h3 className="text-label font-semibold text-text">Account Session Controls</h3>
          <p className="text-caption text-text-muted mt-0.5">
            Manage your credentials, change active account, or terminate sessions.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <button
          type="button"
          disabled={isProcessing}
          onClick={onSignOut}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button bg-danger hover:bg-danger/90 text-on-action text-btn font-semibold cursor-pointer shadow-xs transition-colors disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          Sign Out of Session
        </button>

        <button
          type="button"
          disabled={isProcessing}
          onClick={onSwitchAccount}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button bg-surface-sunken hover:bg-surface border border-border text-text text-btn font-semibold cursor-pointer shadow-xs transition-colors disabled:opacity-50"
        >
          <LogIn className="w-4 h-4 text-primary" />
          Switch Account / Log In As Another User
        </button>

        <button
          type="button"
          disabled={isProcessing}
          onClick={onSignOutAll}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button bg-surface-sunken hover:bg-surface border border-border text-text-muted hover:text-danger text-btn font-medium cursor-pointer shadow-xs transition-colors disabled:opacity-50"
        >
          <ShieldAlert className="w-4 h-4" />
          Revoke All Other Sessions
        </button>
      </div>
    </div>
  );
}

export function AccountProfileSettings() {
  const { user, logout, logoutAll } = useAuth();
  const { palette, setPalette } = useTheme();
  const navigate = useNavigate();

  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName = cleanEnglishText(user?.fullName, 'Executive Director');
  const displayCompany = cleanEnglishText(user?.companyName, 'ExzaEstate Development Ltd.');

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .filter((char) => /[A-Z0-9]/.test(char))
      .slice(0, 2)
      .join('') || 'EX';

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      setIsSignOutModalOpen(false);
      navigate('/auth/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSwitchAccount = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      navigate('/auth/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSignOutAll = async () => {
    if (
      !window.confirm('Are you sure you want to terminate all active sessions across all devices?')
    ) {
      return;
    }
    setIsSigningOut(true);
    try {
      await logoutAll();
      navigate('/auth/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <ProfileIdentityCard
        user={user}
        displayName={displayName}
        displayCompany={displayCompany}
        initials={initials}
      />

      <ThemeSelectorCard currentPalette={palette} onSelectPalette={setPalette} />

      <AccountSecurityCard user={user} />

      <SessionActionsCard
        onSignOut={() => setIsSignOutModalOpen(true)}
        onSwitchAccount={handleSwitchAccount}
        onSignOutAll={handleSignOutAll}
        isProcessing={isSigningOut}
      />

      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={handleConfirmSignOut}
        isSigningOut={isSigningOut}
      />
    </div>
  );
}
