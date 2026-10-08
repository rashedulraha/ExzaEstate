import { Building2, KeyRound, Activity, ShieldCheck, Moon } from 'lucide-react';
import type { NavigateFunction } from 'react-router';
import type { PlatformActionItem } from './PlatformPaletteResults.js';

export interface CreatePlatformActionsParams {
  navigate: NavigateFunction;
  onClose: () => void;
  onOpenOnboardModal?: () => void;
  onOpenLicenseModal?: () => void;
}

export function createPlatformActions({
  navigate,
  onClose,
  onOpenOnboardModal,
  onOpenLicenseModal,
}: CreatePlatformActionsParams): PlatformActionItem[] {
  return [
    {
      id: 'action-onboard',
      title: 'Register New Company',
      description: 'Create and activate a new client company workspace',
      icon: Building2,
      badge: 'New Company',
      run: () => {
        onOpenOnboardModal?.();
        onClose();
      },
    },
    {
      id: 'action-license',
      title: 'Create Software License',
      description: 'Issue a verified software license for a client company or device',
      icon: KeyRound,
      badge: 'License',
      run: () => {
        onOpenLicenseModal?.();
        onClose();
      },
    },
    {
      id: 'action-dashboard',
      title: 'Platform Overview Dashboard',
      description: 'View executive company metrics, operational summary, and quick shortcuts',
      icon: Activity,
      badge: 'Overview',
      run: () => {
        navigate('/system/dashboard');
        onClose();
      },
    },
    {
      id: 'action-telemetry',
      title: 'System Status & Performance',
      description: 'Check server health, memory status, database connectivity, and task queues',
      icon: Activity,
      badge: 'Status',
      run: () => {
        navigate('/system/health');
        onClose();
      },
    },
    {
      id: 'action-tenants',
      title: 'Browse Company Directory',
      description: 'View client companies, subscription status, and branch assignments',
      icon: Building2,
      badge: 'Companies',
      run: () => {
        navigate('/system/tenants');
        onClose();
      },
    },
    {
      id: 'action-licenses-registry',
      title: 'Browse Software Licenses',
      description: 'View active customer licenses, validity periods, and device limits',
      icon: KeyRound,
      badge: 'Licenses',
      run: () => {
        navigate('/system/licenses');
        onClose();
      },
    },
    {
      id: 'action-audit-log',
      title: 'System Activity & Audit Log',
      description: 'View permanent platform activity history and administrator actions',
      icon: ShieldCheck,
      badge: 'Activity',
      run: () => {
        navigate('/system/audit');
        onClose();
      },
    },
    {
      id: 'action-theme',
      title: 'Change Color Mode',
      description: 'Switch between light daylight mode and dark obsidian mode',
      icon: Moon,
      badge: 'Display',
      run: () => {
        document.documentElement.classList.toggle('dark');
        onClose();
      },
    },
  ];
}
