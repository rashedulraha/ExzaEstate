import { useEffect, type ReactNode } from 'react';
import type { NavigateFunction } from 'react-router';
import type { User } from '@exzaestate/app-core';
import type { HeaderProps } from '@exzaestate/ui';
import { cleanEnglishText } from '@exzaestate/shared';
import { PlatformCommandPalette } from './system-admin/components/PlatformCommandPalette.js';
import { GlobalSearchCommandPalette } from './search/components/GlobalSearchCommandPalette.js';
import { createSidebarNavGroups, createSystemAdminSidebarNavGroups } from './navigation.config.js';

export function resolveSidebarConfig(
  user: User | null,
  isSuperAdmin: boolean,
  navigate: NavigateFunction,
) {
  const sidebarGroups = isSuperAdmin
    ? createSystemAdminSidebarNavGroups(navigate)
    : createSidebarNavGroups(navigate);
  const displayCompany = isSuperAdmin
    ? 'Exzazon Platform Administration'
    : cleanEnglishText(user?.companyName, 'ExzaEstate Development Ltd.');
  return { sidebarGroups, displayCompany };
}

export function isUserSuperAdmin(companyId?: string, permissions?: string[]): boolean {
  return (
    companyId === '00000000-0000-0000-0000-000000000000' || Boolean(permissions?.includes('*'))
  );
}

export function getRoleSpecificRedirect(isSuperAdmin: boolean, pathname: string): string | null {
  if (isSuperAdmin && (pathname === '/dashboard' || pathname === '/system'))
    return '/system/dashboard';
  if (isSuperAdmin && pathname === '/audit') return '/system/audit';
  if (isSuperAdmin && pathname === '/profile') return '/system/profile';
  if (!isSuperAdmin && pathname.startsWith('/system')) return '/dashboard';
  return null;
}

export function useSearchShortcut(toggle: () => void) {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isKeyK = e.key === 'k' || e.key === 'K';
      if (isCmdOrCtrl && isKeyK) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggle]);
}

interface HeaderActions {
  onSearch: () => void;
  onNotif: () => void;
  onProfile: () => void;
}

export function buildHeaderProps(
  user: User | null,
  isSuperAdmin: boolean,
  actions: HeaderActions,
): HeaderProps {
  if (isSuperAdmin) {
    return {
      userName: user?.fullName || 'Super Administrator',
      companyName: 'Platform Administration',
      userEmail: user?.email,
      branchName: 'Global Administration',
      fiscalYear: 'System v2.4.0',
      searchPlaceholder: 'Search companies, actions, licenses...',
      onOpenCommandPalette: actions.onSearch,
      onNotificationsClick: actions.onNotif,
      onProfileClick: actions.onProfile,
    };
  }

  return {
    userName: cleanEnglishText(user?.fullName, 'User'),
    companyName: cleanEnglishText(user?.companyName, 'ExzaEstate Development Ltd.'),
    userEmail: user?.email,
    branchName: 'Head Office',
    fiscalYear: 'FY 2026–27 (Q3)',
    searchPlaceholder: 'Search properties, customers, bookings...',
    onOpenCommandPalette: actions.onSearch,
    onNotificationsClick: actions.onNotif,
    onProfileClick: actions.onProfile,
  };
}

export function SearchPaletteContainer({
  isSuperAdmin,
  isOpen,
  onClose,
}: {
  isSuperAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
}): ReactNode {
  if (isSuperAdmin) {
    return <PlatformCommandPalette isOpen={isOpen} onClose={onClose} />;
  }
  return <GlobalSearchCommandPalette isOpen={isOpen} onClose={onClose} />;
}
