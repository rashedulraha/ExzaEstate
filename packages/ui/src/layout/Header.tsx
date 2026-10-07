import { Search, Bell, PanelLeftOpen } from 'lucide-react';
import { cleanEnglishText } from '@exzaestate/shared';
import type { BreadcrumbItem } from './Breadcrumbs.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';

export interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  companyName?: string;
  branchName?: string;
  isLocalMode?: boolean;
  fiscalYear?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onHoverSidebarToggle?: () => void;
  onOpenCommandPalette?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  className?: string;
  showThemeToggle?: boolean;
  searchPlaceholder?: string;
}

function HeaderUserMenu({
  userName,
  companyName,
  userEmail,
  onProfileClick,
}: {
  userName?: string;
  companyName?: string;
  userEmail?: string;
  onProfileClick?: () => void;
}) {
  const fallbackFromEmail = userEmail
    ? userEmail
        .split('@')[0]!
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Executive Director';

  const rawDisplayName = userName || fallbackFromEmail;
  const displayName = cleanEnglishText(rawDisplayName, fallbackFromEmail);
  const displayCompany = cleanEnglishText(companyName, 'Exza Holdings Ltd.');

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .filter((char) => /[A-Z0-9]/.test(char))
      .slice(0, 2)
      .join('') || 'EX';

  const userDisplay = (
    <>
      <div className="w-8 h-8 rounded-full bg-primary-deep text-white flex items-center justify-center font-semibold text-caption border border-primary/40 shrink-0">
        {initials}
      </div>
      <div className="hidden sm:flex flex-col min-w-0 pr-0.5">
        <span className="text-small font-semibold text-sidebar-fg truncate max-w-[140px] leading-tight">
          {displayName}
        </span>
        <span className="text-caption text-sidebar-muted truncate max-w-[140px] leading-tight">
          {displayCompany}
        </span>
      </div>
    </>
  );

  if (onProfileClick) {
    return (
      <button
        type="button"
        onClick={onProfileClick}
        className="flex items-center gap-2.5 py-1 text-left cursor-pointer hover:opacity-85 focus:outline-none transition-opacity"
        aria-label={`User profile for ${displayName} at ${displayCompany}`}
        title={`${displayName} — ${displayCompany}`}
      >
        {userDisplay}
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-2.5 py-1 text-left select-none"
      title={`${displayName} — ${displayCompany}`}
    >
      {userDisplay}
    </div>
  );
}

function HeaderSearchButton({
  onOpenCommandPalette,
  placeholder = 'Search records, actions, vouchers...',
}: {
  onOpenCommandPalette?: () => void;
  placeholder?: string;
}) {
  return (
    <div className="flex-1 max-w-md mx-4 hidden md:flex items-center gap-2">
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="flex-1 flex items-center justify-between px-3 py-1.5 bg-surface-sunken/50 hover:bg-surface-sunken text-sidebar-muted hover:text-sidebar-fg rounded-button border border-sidebar-border hover:border-border-strong text-small transition-colors cursor-pointer shadow-xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Search className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
          <span className="truncate">{placeholder}</span>
        </div>
        <kbd className="text-caption bg-surface px-1.5 py-0.5 rounded border border-sidebar-border font-mono text-sidebar-muted shrink-0">
          ⌘K
        </kbd>
      </button>
    </div>
  );
}

function HeaderSidebarToggle({
  isSidebarCollapsed,
  onToggleSidebar,
  onHoverSidebarToggle,
}: {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onHoverSidebarToggle?: () => void;
}) {
  // Only render when sidebar is collapsed to re-expand; sidebar has its own close button when open
  if (!onToggleSidebar || !isSidebarCollapsed) return null;

  return (
    <button
      type="button"
      onClick={onToggleSidebar}
      onMouseEnter={onHoverSidebarToggle}
      className="p-1.5 rounded-button text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover active:scale-[0.96] cursor-pointer transition-colors"
      title="Expand sidebar (⌘[ or Click)"
      aria-label="Expand sidebar"
    >
      <PanelLeftOpen className="w-4 h-4 text-sidebar-fg" />
    </button>
  );
}

function HeaderMetaBadges({
  branchName,
  fiscalYear,
}: {
  branchName?: string;
  fiscalYear?: string;
}) {
  if (!branchName && !fiscalYear) return null;
  return (
    <div className="hidden lg:flex items-center gap-1.5 text-caption">
      {branchName && (
        <span className="px-2 py-0.5 rounded bg-surface-sunken text-sidebar-fg border border-sidebar-border font-medium">
          {branchName}
        </span>
      )}
      {fiscalYear && (
        <span className="px-2 py-0.5 rounded bg-surface-sunken/60 text-sidebar-muted border border-sidebar-border font-mono">
          {fiscalYear}
        </span>
      )}
    </div>
  );
}

function HeaderNotificationButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1.5 rounded-button text-sidebar-muted hover:text-sidebar-fg hover:bg-sidebar-hover active:scale-[0.96] cursor-pointer transition-all relative"
      aria-label="Notifications"
    >
      <Bell className="w-4 h-4" />
      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-sidebar" />
    </button>
  );
}

export function Header(props: HeaderProps) {
  const showThemeToggle = props.showThemeToggle ?? true;
  const className = props.className ?? '';

  return (
    <header
      className={`h-14 bg-sidebar text-sidebar-fg px-3 sm:px-5 flex items-center justify-between sticky top-0 z-20 select-none ${className}`}
    >
      <div className="flex items-center gap-2 shrink-0">
        <HeaderSidebarToggle
          isSidebarCollapsed={props.isSidebarCollapsed}
          onToggleSidebar={props.onToggleSidebar}
          onHoverSidebarToggle={props.onHoverSidebarToggle}
        />
        <HeaderMetaBadges branchName={props.branchName} fiscalYear={props.fiscalYear} />
      </div>

      <HeaderSearchButton
        onOpenCommandPalette={props.onOpenCommandPalette}
        placeholder={props.searchPlaceholder}
      />

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {showThemeToggle && <ThemeToggle />}
        <HeaderNotificationButton onClick={props.onNotificationsClick} />
        <div className="h-5 w-px bg-sidebar-border mx-0.5" aria-hidden="true" />
        <HeaderUserMenu
          userName={props.userName}
          companyName={props.companyName}
          userEmail={props.userEmail}
          onProfileClick={props.onProfileClick}
        />
      </div>
    </header>
  );
}
