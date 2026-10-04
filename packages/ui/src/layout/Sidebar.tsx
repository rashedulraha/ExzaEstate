import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  FileSpreadsheet,
  ShoppingBag,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string | number;
  onClick?: () => void;
}

export interface SidebarNavGroup {
  id: string;
  title: string;
  items: SidebarNavItem[];
}

export interface SidebarProps {
  currentRouteId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  groups?: SidebarNavGroup[];
  companyName?: string;
  className?: string;
}

export const defaultSidebarGroups: SidebarNavGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
    ],
  },
  {
    id: 'crm',
    title: 'CRM & Sales',
    items: [
      {
        id: 'leads',
        label: 'Leads & Pipeline',
        icon: <Users className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
      {
        id: 'bookings',
        label: 'Bookings',
        icon: <Receipt className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
    ],
  },
  {
    id: 'property',
    title: 'Property',
    items: [
      {
        id: 'properties',
        label: 'Inventory & Plots',
        icon: <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & Accounts',
    items: [
      {
        id: 'collections',
        label: 'Collections',
        icon: <Receipt className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
      {
        id: 'journals',
        label: 'General Ledger',
        icon: <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
    ],
  },
  {
    id: 'procurement',
    title: 'Procurement',
    items: [
      {
        id: 'purchases',
        label: 'Purchase Orders',
        icon: <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    items: [
      {
        id: 'analytics',
        label: 'Financial Reports',
        icon: <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      {
        id: 'settings',
        label: 'Settings & Security',
        icon: <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
    ],
  },
];

function SidebarItem({
  item,
  isActive,
  isCollapsed,
}: {
  item: SidebarNavItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const activeStyle = isActive
    ? 'bg-white/8 text-white font-medium'
    : 'text-white/65 hover:text-white hover:bg-white/4';
  const justifyStyle = isCollapsed ? 'justify-center' : '';

  return (
    <li>
      <button
        type="button"
        onClick={item.onClick}
        title={isCollapsed ? item.label : undefined}
        className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-button text-small transition-colors duration-100 cursor-pointer ${activeStyle} ${justifyStyle}`}
      >
        {isActive && (
          <div
            aria-hidden="true"
            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-accent rounded-r"
          />
        )}
        {item.icon}
        {!isCollapsed && <span className="truncate">{item.label}</span>}
        {!isCollapsed && item.badge !== undefined && (
          <span className="ml-auto text-caption bg-white/10 px-1.5 py-0.2 rounded-full text-white/90">
            {item.badge}
          </span>
        )}
      </button>
    </li>
  );
}

interface SidebarHeaderProps {
  isCollapsed: boolean;
  companyName: string;
  onToggleCollapse?: () => void;
}

function SidebarHeader({ isCollapsed, companyName, onToggleCollapse }: SidebarHeaderProps) {
  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="w-8 h-8 rounded-button bg-accent flex items-center justify-center shrink-0">
          <span className="font-bold text-white text-small">EE</span>
        </div>
        {!isCollapsed && (
          <span className="text-body font-semibold text-white truncate tracking-tight">
            {companyName}
          </span>
        )}
      </div>
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-white/60 hover:text-white p-1 rounded-button hover:bg-white/5 cursor-pointer focus:outline-none"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

export function Sidebar({
  currentRouteId = 'properties',
  isCollapsed = false,
  onToggleCollapse,
  groups = defaultSidebarGroups,
  companyName = 'ExzaEstate ERP',
  className = '',
}: SidebarProps) {
  const widthClass = isCollapsed ? 'w-[72px]' : 'w-[260px]';

  return (
    <aside
      aria-label="Sidebar navigation"
      className={`fixed left-0 top-0 bottom-0 z-30 bg-primary flex flex-col transition-all duration-200 select-none ${widthClass} ${className}`}
    >
      <SidebarHeader
        isCollapsed={isCollapsed}
        companyName={companyName}
        onToggleCollapse={onToggleCollapse}
      />

      <div className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        {groups.map((group) => (
          <div key={group.id} className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 text-h6 font-medium text-white/50 tracking-wider">
                {group.title}
              </h3>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  isActive={item.id === currentRouteId}
                  isCollapsed={isCollapsed}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
