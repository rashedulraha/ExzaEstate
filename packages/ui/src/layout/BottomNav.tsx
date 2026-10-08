import type { ReactNode } from 'react';
import { Building2, Users, FileSpreadsheet, Receipt, Menu } from 'lucide-react';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
}

export interface BottomNavProps {
  currentRouteId?: string;
  onNavigate?: (id: string) => void;
  onOpenMenu?: () => void;
  items?: BottomNavItem[];
  className?: string;
}

export const defaultBottomNavItems: BottomNavItem[] = [
  {
    id: 'properties',
    label: 'Properties',
    icon: <Building2 className="w-5 h-5 shrink-0" aria-hidden="true" />,
  },
  {
    id: 'leads',
    label: 'CRM',
    icon: <Users className="w-5 h-5 shrink-0" aria-hidden="true" />,
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: <FileSpreadsheet className="w-5 h-5 shrink-0" aria-hidden="true" />,
  },
  {
    id: 'accounting',
    label: 'Accounts',
    icon: <Receipt className="w-5 h-5 shrink-0" aria-hidden="true" />,
  },
];

export function BottomNav({
  currentRouteId = 'properties',
  onNavigate,
  onOpenMenu,
  items = defaultBottomNavItems,
  className = '',
}: BottomNavProps) {
  return (
    <nav
      role="navigation"
      aria-label="Mobile Bottom Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 bg-sidebar/95 backdrop-blur-md border-t border-sidebar-border px-2 safe-area-bottom md:hidden flex items-center justify-around select-none shadow-lg ${className}`}
    >
      {items.map((item) => {
        const isActive = currentRouteId === item.id;
        const colorClass = isActive
          ? 'text-primary font-semibold'
          : 'text-sidebar-muted hover:text-sidebar-fg';

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.onClick) item.onClick();
              else if (onNavigate) onNavigate(item.id);
            }}
            className={`touch-target flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-caption transition-colors active:scale-[0.96] focus:outline-none ${colorClass}`}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
          >
            <div
              className={`p-1 rounded-full transition-colors ${isActive ? 'bg-primary/10' : ''}`}
            >
              {item.icon}
            </div>
            <span className="text-[11px] leading-tight truncate max-w-[64px]">{item.label}</span>
          </button>
        );
      })}

      {onOpenMenu && (
        <button
          type="button"
          onClick={onOpenMenu}
          className="touch-target flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-caption text-sidebar-muted hover:text-sidebar-fg transition-colors active:scale-[0.96] focus:outline-none"
          aria-label="Open full menu"
        >
          <div className="p-1 rounded-full hover:bg-sidebar-hover">
            <Menu className="w-5 h-5 shrink-0" aria-hidden="true" />
          </div>
          <span className="text-[11px] leading-tight">Menu</span>
        </button>
      )}
    </nav>
  );
}
