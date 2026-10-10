import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building,
  Palette,
  Check,
  Globe,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import type { User as AuthUser } from '@exzaestate/app-core';
import { cleanEnglishText } from '@exzaestate/shared';
import { THEME_PALETTES, type ThemePalette, type Theme } from '@exzaestate/ui';

export interface ProfileIdentityCardProps {
  user: AuthUser | null;
  displayName: string;
  displayCompany: string;
  initials: string;
}

export function ProfileIdentityCard({
  user,
  displayName,
  displayCompany,
  initials,
}: ProfileIdentityCardProps) {
  const isSuperAdmin = user?.companyId === '00000000-0000-0000-0000-000000000000';
  const roleLabel = isSuperAdmin
    ? 'Super Administrator'
    : cleanEnglishText(user?.scopes?.['role'], 'Authorized Executive');

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center font-bold text-h2 shadow-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-h2 font-bold text-text truncate">{displayName}</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-semibold bg-success/10 text-success border border-success/20">
              <CheckCircle2 className="w-3 h-3" />
              Active Account
            </span>
          </div>
          <p className="text-body text-text-muted mt-0.5">{user?.email || 'N/A'}</p>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-caption text-text-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-text">
              <Building className="w-3.5 h-3.5 text-primary" />
              {displayCompany}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-text">
              <Shield className="w-3.5 h-3.5 text-text-muted" />
              {roleLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface ThemeSelectorCardProps {
  currentPalette: ThemePalette;
  onSelectPalette: (palette: ThemePalette) => void;
}

export function ThemeSelectorCard({ currentPalette, onSelectPalette }: ThemeSelectorCardProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-label font-semibold text-text">
              Workspace Appearance & Brand Theme
            </h3>
            <p className="text-caption text-text-muted mt-0.5">
              Select an industry-standard brand palette. Your selection applies instantly across the
              entire enterprise ERP.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
        {THEME_PALETTES.map((t) => {
          const isSelected = currentPalette === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectPalette(t.id)}
              className={`flex flex-col text-left p-3.5 rounded-card border transition-all cursor-pointer relative group ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/30'
                  : 'border-border bg-surface-sunken hover:bg-surface hover:border-border-strong'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 rounded-full shadow-xs border border-white/20 inline-block"
                    style={{ backgroundColor: t.primaryColor }}
                    aria-hidden="true"
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full shadow-xs border border-white/20 inline-block -ml-2"
                    style={{ backgroundColor: t.accentColor }}
                    aria-hidden="true"
                  />
                  <span
                    className="w-3 h-3 rounded-full shadow-xs border border-white/20 inline-block -ml-2"
                    style={{ backgroundColor: t.secondaryColor }}
                    aria-hidden="true"
                  />
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>
              <span className="text-label font-bold text-text group-hover:text-primary transition-colors">
                {t.name}
              </span>
              <span className="text-caption text-text-muted mt-0.5 font-medium">{t.tagline}</span>
              <p className="text-caption text-text-dim mt-2 line-clamp-2">{t.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface DisplayModeCardProps {
  currentTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
}

export function DisplayModeCard({ currentTheme, onSelectTheme }: DisplayModeCardProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-label font-semibold text-text">Display Mode & Interface Theme</h3>
            <p className="text-caption text-text-muted mt-0.5">
              Toggle between daylight light mode, obsidian dark mode, or follow your computer&apos;s
              system default.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <button
          type="button"
          onClick={() => onSelectTheme('light')}
          className={`p-3 rounded-card border flex items-center justify-center gap-2.5 cursor-pointer transition ${
            currentTheme === 'light'
              ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30'
              : 'border-border bg-surface-sunken/40 text-text hover:bg-surface-sunken'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span className="text-caption font-medium">Light Mode</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTheme('dark')}
          className={`p-3 rounded-card border flex items-center justify-center gap-2.5 cursor-pointer transition ${
            currentTheme === 'dark'
              ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30'
              : 'border-border bg-surface-sunken/40 text-text hover:bg-surface-sunken'
          }`}
        >
          <Moon className="w-4 h-4" />
          <span className="text-caption font-medium">Dark Mode</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTheme('system')}
          className={`p-3 rounded-card border flex items-center justify-center gap-2.5 cursor-pointer transition ${
            currentTheme === 'system'
              ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30'
              : 'border-border bg-surface-sunken/40 text-text hover:bg-surface-sunken'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span className="text-caption font-medium">System (Auto Follow OS)</span>
        </button>
      </div>
    </div>
  );
}

export function AccountSecurityCard({ user }: { user: AuthUser | null }) {
  const twoFactorEnabled = Boolean(user?.isTwoFactorEnabled);

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-label font-semibold text-text">Account Security & Verification</h3>
        </div>
        <span className="text-caption font-semibold text-success flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Verified Status
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-card bg-surface-sunken border border-border/60">
          <span className="text-caption text-text-muted block font-medium">
            Authentication Status
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-small font-semibold text-text">Authenticated & Active</span>
          </div>
          <span className="text-caption text-text-dim mt-1 block">Secure Enterprise Session</span>
        </div>

        <div className="p-3.5 rounded-card bg-surface-sunken border border-border/60">
          <span className="text-caption text-text-muted block font-medium">
            Two-Factor Protection
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-small font-semibold text-text">
              {twoFactorEnabled ? '2FA Enabled & Active' : 'Standard Protection'}
            </span>
          </div>
          <span className="text-caption text-text-dim mt-1 block">Account Access Guarded</span>
        </div>

        <div className="p-3.5 rounded-card bg-surface-sunken border border-border/60">
          <span className="text-caption text-text-muted block font-medium">
            Operating Region & Time
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <Globe className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-small font-semibold text-text">Dhaka, Bangladesh</span>
          </div>
          <span className="text-caption text-text-dim mt-1 block">
            <Clock className="w-3 h-3 inline mr-1" />
            BST (UTC+06:00)
          </span>
        </div>
      </div>
    </div>
  );
}
