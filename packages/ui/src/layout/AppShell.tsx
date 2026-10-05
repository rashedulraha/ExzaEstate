import React, { useState } from 'react';
import { Sidebar, type SidebarNavGroup, defaultSidebarGroups } from './Sidebar.js';
import { Header, type HeaderProps } from './Header.js';
import { CommandPalette, type CommandItem } from './CommandPalette.js';

export interface AppShellProps {
  children: React.ReactNode;
  headerProps?: Partial<HeaderProps>;
  currentRouteId?: string;
  sidebarGroups?: SidebarNavGroup[];
  commandItems?: CommandItem[];
  companyName?: string;
  isLocalMode?: boolean;
}

export function AppShell({
  children,
  headerProps,
  currentRouteId = 'properties',
  sidebarGroups = defaultSidebarGroups,
  commandItems = [],
  companyName = 'ExzaEstate ERP',
  isLocalMode = false,
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const sidebarWidthClass = isSidebarCollapsed ? 'pl-[72px]' : 'pl-[260px]';

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans">
      {/* Fixed Sidebar */}
      <Sidebar
        currentRouteId={currentRouteId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        groups={sidebarGroups}
        companyName={companyName}
      />

      {/* Main Area Offset by Sidebar Width */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${sidebarWidthClass}`}
      >
        <Header
          companyName={companyName}
          isLocalMode={isLocalMode}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          {...headerProps}
        />

        <main className="flex-1 container-page space-y-6">{children}</main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        items={commandItems}
      />
    </div>
  );
}
