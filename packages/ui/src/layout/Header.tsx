import { Search, Bell, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
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

function cleanEnglishText(raw?: string, fallback = ''): string {
  if (!raw) return fallback;
  const parenMatch = raw.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1] && /[A-Za-z]/.test(parenMatch[1])) {
    return parenMatch[1].trim();
  }
  const sanitized = raw.replace(/[\u0980-\u09FF]/g, '').trim();
  return sanitized.length > 0 ? sanitized : fallback;
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

  return (
    <button
      type="button"
      onClick={onProfileClick}
      className="flex items-center gap-2.5 py-1 px-2 rounded-button hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer group text-left border border-transparent hover:border-white/15"
      aria-label={`User menu for ${displayName} at ${displayCompany}`}
      title={`${displayName} — ${displayCompany}`}
    >
      <div className="w-8 h-8 rounded-full bg-primary-deep text-white flex items-center justify-center font-semibold text-caption border border-accent/50 shadow-xs shrink-0 group-hover:border-accent transition-colors">
        {initials}
      </div>
      <div className="hidden sm:flex flex-col min-w-0 pr-0.5">
        <span className="text-small font-semibold text-white truncate max-w-[140px] leading-tight">
          {displayName}
        </span>
        <span className="text-caption text-white/60 truncate max-w-[140px] leading-tight">
          {displayCompany}
        </span>
      </div>
    </button>
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
        className="flex-1 flex items-center justify-between px-3 py-1.5 bg-white/6 hover:bg-white/10 text-white/70 hover:text-white rounded-button border border-white/10 hover:border-white/20 text-small transition-colors cursor-pointer shadow-xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Search className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
          <span className="truncate">{placeholder}</span>
        </div>
        <kbd className="text-caption bg-white/10 px-1.5 py-0.5 rounded border border-white/15 font-mono text-white/80 shrink-0">
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
  if (!onToggleSidebar) return null;
  return (
    <button
      type="button"
      onClick={onToggleSidebar}
      onMouseEnter={onHoverSidebarToggle}
      className="p-1.5 rounded-button text-white/70 hover:text-white hover:bg-white/10 active:scale-[0.96] cursor-pointer transition-colors"
      title={isSidebarCollapsed ? 'Expand sidebar (⌘[ or Click)' : 'Collapse sidebar (⌘[)'}
      aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {isSidebarCollapsed ? (
        <PanelLeftOpen className="w-4 h-4 text-white/80 hover:text-white" />
      ) : (
        <PanelLeftClose className="w-4 h-4 text-white/60 hover:text-white" />
      )}
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
        <span className="px-2 py-0.5 rounded bg-white/10 text-white/80 font-medium">
          {branchName}
        </span>
      )}
      {fiscalYear && (
        <span className="px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/10 font-mono">
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
      className="p-1.5 rounded-button text-white/70 hover:text-white hover:bg-white/10 active:scale-[0.96] cursor-pointer transition-all relative"
      aria-label="Notifications"
    >
      <Bell className="w-4 h-4" />
      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full ring-2 ring-sidebar" />
    </button>
  );
}

export function Header(props: HeaderProps) {
  const showThemeToggle = props.showThemeToggle ?? true;
  const className = props.className ?? '';

  return (
    <header
      className={`h-14 bg-sidebar text-white border-b border-transparent px-3 sm:px-5 flex items-center justify-between sticky top-0 z-20 select-none ${className}`}
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
        <div className="h-5 w-px bg-white/15 mx-0.5" aria-hidden="true" />
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
