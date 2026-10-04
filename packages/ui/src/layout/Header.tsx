import { Search, Bell, User, Building } from 'lucide-react';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs.js';

export interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  companyName?: string;
  branchName?: string;
  isLocalMode?: boolean;
  fiscalYear?: string;
  onOpenCommandPalette?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  userEmail?: string;
  className?: string;
}

export function Header({
  breadcrumbs = [{ label: 'Dashboard' }],
  companyName = 'ExzaEstate Holding Ltd.',
  branchName = 'Dhaka Main Branch',
  isLocalMode = false,
  fiscalYear = 'FY 2026–27',
  onOpenCommandPalette,
  onNotificationsClick,
  onProfileClick,
  userEmail,
  className = '',
}: HeaderProps) {
  return (
    <header
      className={`h-14 bg-surface border-b border-border px-6 flex items-center justify-between sticky top-0 z-20 select-none ${className}`}
    >
      {/* Left: Breadcrumbs & Context */}
      <div className="flex items-center gap-4 min-w-0">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      {/* Center: Global Search Bar trigger (Cmd+K) */}
      <div className="flex-1 max-w-sm mx-4">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-surface-sunken/60 hover:bg-surface-sunken text-text-muted rounded-button border border-border text-small transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Search or command...</span>
          </div>
          <kbd className="text-caption bg-surface px-1.5 py-0.5 rounded border border-border font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Engine Badge, Branch Switcher, Fiscal Year, Notifications, Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* System Engine & Mode Badge */}
        {isLocalMode ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption bg-surface-sunken text-text-muted border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-void" aria-hidden="true" />
            <span>Local Engine (Offline)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption bg-success/12 text-success border border-success/20">
            <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" />
            <span>Cloud Live (Asia/Dhaka)</span>
          </span>
        )}

        {/* Company Context */}
        <span
          className="hidden md:inline-block text-small font-medium text-text truncate max-w-[160px]"
          title={companyName}
        >
          {companyName}
        </span>

        {/* Branch Context Chip */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-surface-sunken text-small text-text">
          <Building className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
          <span className="truncate max-w-[120px]" title={branchName}>
            {branchName}
          </span>
        </div>

        {/* Fiscal Year Chip */}
        <span className="hidden xl:inline-block text-caption text-text-muted bg-surface-sunken px-2 py-1 rounded">
          {fiscalYear}
        </span>

        {/* Notifications Button */}
        <button
          type="button"
          onClick={onNotificationsClick}
          className="p-1.5 rounded-button text-text-muted hover:text-text hover:bg-surface-sunken cursor-pointer transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
        </button>

        {/* User Profile Menu */}
        <button
          type="button"
          onClick={onProfileClick}
          className="flex items-center gap-2 p-1 pl-2 rounded-button hover:bg-surface-sunken cursor-pointer transition-colors text-small"
          aria-label="User Profile"
        >
          <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-medium text-caption">
            <User className="w-3.5 h-3.5" />
          </div>
          {userEmail && (
            <span className="hidden md:inline text-text truncate max-w-[140px]">{userEmail}</span>
          )}
        </button>
      </div>
    </header>
  );
}
