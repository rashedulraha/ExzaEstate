import { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, ShieldCheck, KeyRound, LogOut, LogIn, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '@exzaestate/app-core';
import { useTheme, useToast, Breadcrumbs, Button } from '@exzaestate/ui';
import { SignOutModal } from '../../auth/components/SignOutModal.js';
import {
  ThemeSelectorCard,
  DisplayModeCard,
} from '../../settings/components/AccountProfileComponents.js';

export function PlatformProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme, palette, setPalette } = useTheme();
  const { showToast } = useToast();

  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      setIsSignOutModalOpen(false);
      showToast({
        title: 'Signed Out',
        description: 'Super Admin session terminated safely.',
        family: 'info',
      });
      navigate('/auth/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const adminName = user?.fullName || 'Exzazon Team';
  const adminEmail = user?.email || 'exzazon.bd@gmail.com';
  const secondaryEmail = 'rashedulraha.bd@gmail.com';

  return (
    <div className="container-page space-y-6">
      {/* Breadcrumbs */}
      <div>
        <Breadcrumbs
          items={[
            {
              label: 'Platform Overview',
              href: '/system/dashboard',
              onClick: () => navigate('/system/dashboard'),
            },
            { label: 'Admin Account & Settings' },
          ]}
        />
      </div>

      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-h1 font-semibold tracking-tight text-text">
            Super Admin Account & Security
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium bg-primary/10 text-primary border border-primary/20">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Platform Administration
          </span>
        </div>
        <p className="text-small text-text-muted mt-1">
          Master administrator profile, system-wide access controls, and security protection
          overview.
        </p>
      </div>

      {/* Grid: Profile Identity & Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Identity Profile */}
        <div className="rounded-card border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-h3 font-semibold text-text">Administrator Profile</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary text-on-action flex items-center justify-center font-bold text-h2 shadow-xs shrink-0">
              {adminName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="space-y-0.5">
              <div className="text-h3 font-semibold text-text">{adminName}</div>
              <div className="text-caption font-mono text-text-muted">{adminEmail}</div>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-button text-caption font-medium bg-surface-sunken text-primary border border-border">
                Role: Super Administrator
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/60 text-small">
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-caption">Access Level:</span>
              <span className="font-semibold text-text text-caption">
                All Platform Companies & Data
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-caption">Recovery Email:</span>
              <span className="font-mono text-text text-caption">{secondaryEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-caption">Account Status:</span>
              <span className="font-semibold text-success text-caption">Verified & Active</span>
            </div>
          </div>
        </div>

        {/* Card 2: Platform Security Posture */}
        <div className="rounded-card border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-h3 font-semibold text-text">Platform Security & Protection</h2>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-card bg-surface-sunken/40 border border-border flex items-start gap-3">
              <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-caption font-semibold text-text">
                  High-Grade Password Protection
                </div>
                <div className="text-caption text-text-muted mt-0.5">
                  Secured with salted cryptographic protection to shield master credentials against
                  unauthorized access.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-card bg-surface-sunken/40 border border-border flex items-start gap-3">
              <KeyRound className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-caption font-semibold text-text">
                  Tamper-Proof License Authority
                </div>
                <div className="text-caption text-text-muted mt-0.5">
                  Equipped with private security keys to generate authenticated licenses for
                  customer companies.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-card bg-surface-sunken/40 border border-border flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <div>
                <div className="text-caption font-semibold text-text">
                  Company Data Privacy Guard
                </div>
                <div className="text-caption text-text-muted mt-0.5">
                  Strict automated isolation ensures one client company can never view another
                  company&apos;s data.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Theme Palette Selector (Same as User Dashboard) */}
      <ThemeSelectorCard currentPalette={palette} onSelectPalette={setPalette} />

      {/* Grid: Theme Appearance & Session Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 3: Meridian Display Mode */}
        <DisplayModeCard currentTheme={theme} onSelectTheme={setTheme} />

        {/* Card 4: Session Controls */}
        <div className="rounded-card border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <LogOut className="w-4 h-4 text-primary" />
            <h2 className="text-h3 font-semibold text-text">Session Management</h2>
          </div>

          <p className="text-caption text-text-muted">
            Manage your active Super Admin session or switch to a company account.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/auth/login')}
              leftIcon={<LogIn className="w-3.5 h-3.5" />}
            >
              Switch Account
            </Button>

            <Button
              variant="destructive"
              size="sm"
              className="!bg-[#dc2626] hover:!bg-[#b91c1c] !text-white shadow-xs font-medium"
              onClick={() => setIsSignOutModalOpen(true)}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={handleConfirmSignOut}
        isSigningOut={isSigningOut}
      />
    </div>
  );
}
