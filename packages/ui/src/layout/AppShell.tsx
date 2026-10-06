import React, { useState, useRef, useEffect } from 'react';
import { Sidebar, type SidebarNavGroup, defaultSidebarGroups } from './Sidebar.js';
import { Header, type HeaderProps } from './Header.js';
import { CommandPalette, type CommandItem } from './CommandPalette.js';
import { useSidebarResize } from './useSidebarResize.js';

export interface AppShellProps {
  children: React.ReactNode;
  headerProps?: Partial<HeaderProps>;
  currentRouteId?: string;
  sidebarGroups?: SidebarNavGroup[];
  commandItems?: CommandItem[];
  companyName?: string;
  isLocalMode?: boolean;
  onQuickAction?: () => void;
}

function useSidebarPeek(setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>) {
  const [isPeeking, setIsPeeking] = useState(false);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnterPeek = () => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    setIsPeeking(true);
  };

  const handleMouseLeavePeek = () => {
    peekTimerRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 250);
  };

  const handlePin = () => {
    setIsPeeking(false);
    setIsSidebarCollapsed(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSidebarCollapsed]);

  return {
    isPeeking,
    setIsPeeking,
    handleMouseEnterPeek,
    handleMouseLeavePeek,
    handlePin,
  };
}

function resolveAppShellConfig(props: AppShellProps) {
  return {
    currentRouteId: props.currentRouteId ?? 'properties',
    sidebarGroups: props.sidebarGroups ?? defaultSidebarGroups,
    companyName: props.companyName ?? 'ExzaEstate ERP',
    isLocalMode: Boolean(props.isLocalMode),
    commandItems: props.commandItems ?? [],
  };
}

function resolveQuickAction(props: AppShellProps, fallback: () => void): () => void {
  if (props.onQuickAction) return props.onQuickAction;
  if (props.headerProps?.onOpenCommandPalette) return props.headerProps.onOpenCommandPalette;
  return fallback;
}

function AppShellEdgeSensor({
  isSidebarOpen,
  onMouseEnter,
}: {
  isSidebarOpen: boolean;
  onMouseEnter: () => void;
}) {
  if (isSidebarOpen) return null;
  return (
    <div
      role="region"
      aria-label="Sidebar peek edge sensor"
      className="fixed left-0 top-0 w-3.5 h-full z-40 cursor-e-resize bg-transparent hover:bg-white/5 transition-colors"
      onMouseEnter={onMouseEnter}
      title="Hover to peek sidebar"
    />
  );
}

export function AppShell(props: AppShellProps) {
  const config = resolveAppShellConfig(props);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const { isPeeking, setIsPeeking, handleMouseEnterPeek, handleMouseLeavePeek, handlePin } =
    useSidebarPeek(setIsSidebarCollapsed);

  const {
    width: sidebarWidth,
    isDragging,
    isHoveringResizer,
    setIsHoveringResizer,
    handleMouseDown,
  } = useSidebarResize(isSidebarCollapsed, () => setIsSidebarCollapsed((prev) => !prev));

  const isSidebarOpen = !isSidebarCollapsed || isPeeking;
  const triggerQuickAction = resolveQuickAction(props, () => setIsCommandPaletteOpen(true));

  return (
    <div className="h-screen w-screen overflow-hidden bg-sidebar text-text flex font-sans select-none">
      {/* Sidebar Wrapper in Layout Flow with Smooth Width Animation */}
      <div
        style={{ width: isSidebarOpen ? `${sidebarWidth}px` : 0 }}
        className="h-full shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden relative"
        onMouseLeave={handleMouseLeavePeek}
      >
        <Sidebar
          currentRouteId={config.currentRouteId}
          isCollapsed={!isSidebarOpen}
          isPeek={isPeeking}
          onClosePeek={() => setIsPeeking(false)}
          onPin={handlePin}
          onToggleCollapse={() => {
            setIsPeeking(false);
            setIsSidebarCollapsed((prev) => !prev);
          }}
          onQuickAction={triggerQuickAction}
          onItemClick={() => {
            if (isPeeking) setIsPeeking(false);
          }}
          groups={config.sidebarGroups}
          companyName={config.companyName}
          width={sidebarWidth}
          isDragging={isDragging}
          isHoveringResizer={isHoveringResizer}
          setIsHoveringResizer={setIsHoveringResizer}
          handleMouseDown={handleMouseDown}
        />
      </div>

      {/* Edge Sensor for Left Hover Peek when Collapsed */}
      <AppShellEdgeSensor isSidebarOpen={isSidebarOpen} onMouseEnter={handleMouseEnterPeek} />

      {/* Main Workspace Area in Flex Flow */}
      <div className="flex-1 flex flex-col min-w-0 bg-sidebar h-full overflow-hidden">
        <Header
          companyName={config.companyName}
          isLocalMode={config.isLocalMode}
          isSidebarCollapsed={!isSidebarOpen}
          onToggleSidebar={() => {
            setIsPeeking(false);
            setIsSidebarCollapsed((prev) => !prev);
          }}
          onHoverSidebarToggle={handleMouseEnterPeek}
          onOpenCommandPalette={triggerQuickAction}
          className="shrink-0"
          {...props.headerProps}
        />

        {/* Curved Workspace Canvas: Stationary & Fixed on Scroll */}
        <div className="flex-1 min-h-0 bg-bg rounded-tl-2xl sm:rounded-tl-[24px] border-t border-l border-white/10 sm:border-sidebar-border shadow-xs overflow-hidden flex flex-col">
          <main className="flex-1 min-h-0 overflow-y-auto container-page p-4 sm:p-6 lg:p-8 space-y-6">
            {props.children}
          </main>
        </div>
      </div>

      {/* Fallback Command Palette if not handled globally */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        items={config.commandItems}
      />
    </div>
  );
}
