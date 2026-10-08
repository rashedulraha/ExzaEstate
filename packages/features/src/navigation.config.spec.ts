import { describe, it, expect, vi } from 'vitest';
import {
  createSidebarNavGroups,
  createSystemAdminSidebarNavGroups,
  resolveCurrentRouteId,
} from './navigation.config.js';

describe('navigation.config', () => {
  it('structures sidebar groups into 5 clean enterprise lifecycle groups', () => {
    const navigate = vi.fn();
    const groups = createSidebarNavGroups(navigate);

    expect(groups).toHaveLength(5);
    const [g0, g1, g2, g3, g4] = groups;
    if (!g0 || !g1 || !g2 || !g3 || !g4) throw new Error('Missing groups');

    // Group 01: Core Overview & Reports
    expect(g0.title).toBe('Overview & Reports');
    expect(g0.items.map((i) => i.id)).toEqual(['dashboard', 'reports']);

    // Group 02: Property Assets & Inventory
    expect(g1.title).toBe('Property Assets');
    expect(g1.items.map((i) => i.id)).toEqual(['properties']);

    // Group 03: Sales & CRM Pipeline
    expect(g2.title).toBe('Sales Pipeline');
    expect(g2.items.map((i) => i.id)).toEqual([
      'leads',
      'customers',
      'quotations',
      'bookings',
      'approvals',
    ]);

    // Group 04: Finance & Treasury
    expect(g3.title).toBe('Finance & Treasury');
    expect(g3.items.map((i) => i.id)).toEqual(['collections', 'aging', 'journals', 'operations']);

    // Group 05: Workspace & Admin
    expect(g4.title).toBe('Workspace & Admin');
    expect(g4.items.map((i) => i.id)).toEqual([
      'users',
      'settings',
      'setup',
      'migration',
      'audit',
      'profile',
    ]);
  });

  it('navigates to the appropriate path when item onClick is invoked', () => {
    const navigate = vi.fn();
    const groups = createSidebarNavGroups(navigate);
    const [, g1, , , g4] = groups;
    if (!g1 || !g4) throw new Error('Missing groups');

    const propertiesItem = g1.items.find((i) => i.id === 'properties');
    propertiesItem?.onClick?.();
    expect(navigate).toHaveBeenCalledWith('/properties');

    const profileItem = g4.items.find((i) => i.id === 'profile');
    profileItem?.onClick?.();
    expect(navigate).toHaveBeenCalledWith('/profile');
  });

  it('correctly resolves route IDs from pathnames', () => {
    expect(resolveCurrentRouteId('/properties')).toBe('properties');
    expect(resolveCurrentRouteId('/crm/leads')).toBe('leads');
    expect(resolveCurrentRouteId('/sales/bookings')).toBe('bookings');
    expect(resolveCurrentRouteId('/collection/receipts')).toBe('collections');
    expect(resolveCurrentRouteId('/accounting/coa')).toBe('journals');
    expect(resolveCurrentRouteId('/profile')).toBe('profile');
    expect(resolveCurrentRouteId('/unknown-route')).toBe('dashboard');
  });

  it('structures super-admin sidebar groups with clean titles', () => {
    const navigate = vi.fn();
    const adminGroups = createSystemAdminSidebarNavGroups(navigate);

    expect(adminGroups.map((g) => g.title)).toEqual([
      'Platform Overview',
      'Companies & Licenses',
      'System & Server Health',
      'Admin Account',
    ]);
  });
});
