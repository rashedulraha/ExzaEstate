import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProfilePage } from './pages/ProfilePage.js';

const mockLogout = vi.fn();
const mockLogoutAll = vi.fn();

vi.mock('@exzaestate/app-core', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-99998888',
      fullName: 'Anwar Hossain',
      email: 'md@exzaestate.com',
      companyId: 'comp-1',
      companyName: 'ExzaEstate Development Ltd.',
      isTwoFactorEnabled: true,
      permissions: ['*'],
      scopes: { role: 'Managing Director' },
      branchIds: ['branch-dhaka'],
    },
    isAuthenticated: true,
    isLoading: false,
    logout: mockLogout,
    logoutAll: mockLogoutAll,
  }),
}));

describe('ProfilePage', () => {
  it('renders user identity, active session status, and account controls', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('My Profile & Account').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Anwar Hossain')).toBeDefined();
    expect(screen.getByText('md@exzaestate.com')).toBeDefined();
    expect(screen.getByText('ExzaEstate Development Ltd.')).toBeDefined();
    expect(screen.getByText('Account Security & Verification')).toBeDefined();
    expect(screen.getByText('Authenticated & Active')).toBeDefined();
    expect(screen.getByText('Meridian Saffron')).toBeDefined();
    expect(screen.getByText('Emerald Estate')).toBeDefined();
    expect(screen.getByText('Sapphire Horizon')).toBeDefined();
    expect(screen.getByText('Royal Amethyst')).toBeDefined();
    expect(screen.getByText('Warm Terracotta')).toBeDefined();
    expect(screen.getByText('Sign Out of Session')).toBeDefined();
    expect(screen.getByText('Switch Account / Log In As Another User')).toBeDefined();
    expect(screen.getByText('Revoke All Other Sessions')).toBeDefined();
  });

  it('opens confirmation modal when Sign Out is clicked', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    const signOutBtn = screen.getByText('Sign Out of Session');
    fireEvent.click(signOutBtn);

    expect(screen.getAllByText('Sign Out').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Are you sure you want to sign out of ExzaEstate ERP\?/)).toBeDefined();
  });
});
