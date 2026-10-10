import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserManagementPage } from './pages/UserManagementPage.js';
import { RoleManagementPage } from './pages/RoleManagementPage.js';
import { RolePermissionsMatrix } from './components/RolePermissionsMatrix.js';

const mockUsers = [
  {
    id: 'usr-1',
    companyId: 'comp-1',
    fullName: 'Rafiqul Islam',
    email: 'md@exzaestate.com',
    phone: '+8801711000000',
    isActive: true,
    roles: [
      {
        id: 'role-1',
        code: 'MANAGING_DIRECTOR',
        name: 'MANAGING_DIRECTOR',
      },
    ],
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'usr-2',
    companyId: 'comp-1',
    fullName: 'Farhana Akter',
    email: 'accounts@exzaestate.com',
    phone: '+8801811000001',
    isActive: true,
    roles: [
      {
        id: 'role-2',
        code: 'CHIEF_ACCOUNTANT',
        name: 'CHIEF_ACCOUNTANT',
      },
    ],
    createdAt: '2026-10-02T00:00:00.000Z',
  },
];

import type { RoleItem } from './schemas/role.schema.js';

const mockRoles: RoleItem[] = [
  {
    id: 'role-1',
    code: 'MANAGING_DIRECTOR',
    name: 'MANAGING_DIRECTOR',
    description: 'Supreme executive role with tenant-wide authority',
    isSystem: true,
    userCount: 1,
    permissions: [
      { permissionCode: 'settings:manage', scope: 'ALL' },
      { permissionCode: 'users:manage', scope: 'ALL' },
    ],
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'role-2',
    code: 'CHIEF_ACCOUNTANT',
    name: 'CHIEF_ACCOUNTANT',
    description: 'Financial director with ledger posting authority',
    isSystem: true,
    userCount: 2,
    permissions: [
      { permissionCode: 'accounting:post', scope: 'BRANCH' },
      { permissionCode: 'reports:view', scope: 'ALL' },
    ],
    updatedAt: '2026-10-02T00:00:00.000Z',
  },
];

const mockBranches = [
  { id: 'branch-main', name: 'Head Office', code: 'HO' },
  { id: 'branch-ctg', name: 'Chittagong Branch', code: 'CTG' },
];

vi.mock('@exzaestate/app-core', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', email: 'md@exzaestate.com', role: 'MANAGING_DIRECTOR' },
    hasRole: (r: string) => r === 'MANAGING_DIRECTOR',
    promptStepUp: vi.fn(),
  }),
}));

vi.mock('@exzaestate/api-client', () => ({
  useUserAdminControllerListUsers: () => ({
    data: { items: mockUsers, total: 2 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUserAdminControllerCreateUser: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUserAdminControllerInviteUser: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUserAdminControllerDeactivateUser: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUserAdminControllerReactivateUser: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUserAdminControllerUpdateUserRoles: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUserAdminControllerUpdateUserBranches: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useBranchControllerListBranches: () => ({
    data: { items: mockBranches, total: 2 },
    isLoading: false,
  }),
  useRoleControllerListRoles: () => ({
    data: { items: mockRoles, total: 2 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useRoleControllerCreateRole: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRoleControllerCloneRole: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRoleControllerUpdateRole: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRoleControllerUpdateRolePermissions: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRoleControllerDeleteRole: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

import { MemoryRouter } from 'react-router';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Users & Roles Management Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UserManagementPage', () => {
    it('renders user table with active users and role badges', () => {
      renderWithClient(<UserManagementPage />);

      expect(screen.getByText('Users & Credentials')).toBeDefined();
      expect(screen.getByText('Rafiqul Islam')).toBeDefined();
      expect(screen.getByText('md@exzaestate.com')).toBeDefined();
      expect(screen.getByText('MANAGING_DIRECTOR')).toBeDefined();
      expect(screen.getByText('Farhana Akter')).toBeDefined();
      expect(screen.getByText('CHIEF_ACCOUNTANT')).toBeDefined();
    });

    it('opens add user modal when clicking Create User button', () => {
      renderWithClient(<UserManagementPage />);

      const addBtn = screen.getByRole('button', { name: /Create User/i });
      fireEvent.click(addBtn);

      expect(screen.getByText('Create New User')).toBeDefined();
      expect(screen.getByText('Full Name')).toBeDefined();
      expect(screen.getByText('Corporate Email')).toBeDefined();
    });

    it('protects the primary account owner and displays Account Owner badge', () => {
      renderWithClient(<UserManagementPage />);

      expect(screen.getByText('Account Owner')).toBeDefined();
      expect(screen.getByText('Edit Access')).toBeDefined();
      expect(screen.getByText('Deactivate')).toBeDefined();
    });

    it('opens confirmation modal before deactivating an employee', () => {
      renderWithClient(<UserManagementPage />);

      const deactivateBtn = screen.getByText('Deactivate');
      fireEvent.click(deactivateBtn);

      expect(screen.getByText('Deactivate Employee Account')).toBeDefined();
      expect(screen.getByText(/Are you sure you want to deactivate Farhana Akter/i)).toBeDefined();
    });
  });

  describe('RoleManagementPage', () => {
    it('renders role table with system roles and user counts', () => {
      renderWithClient(<RoleManagementPage />);

      expect(screen.getByText('Security Roles & Permissions')).toBeDefined();
      expect(screen.getAllByText('MANAGING_DIRECTOR')[0]).toBeDefined();
      expect(screen.getByText('Supreme executive role with tenant-wide authority')).toBeDefined();
      expect(screen.getAllByText('CHIEF_ACCOUNTANT')[0]).toBeDefined();
      expect(screen.getByText('Financial director with ledger posting authority')).toBeDefined();
    });
  });

  describe('RolePermissionsMatrix', () => {
    it('renders matrix with scopes and modules', () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      renderWithClient(
        <RolePermissionsMatrix
          role={mockRoles[0] ?? null}
          onSave={onSave}
          onClose={onClose}
          isSaving={false}
        />,
      );

      expect(screen.getByText(/Permission Matrix:/i)).toBeDefined();
      expect(screen.getByText('Property Inventory')).toBeDefined();
      expect(screen.getByText('CRM & Customers')).toBeDefined();
      expect(screen.getByText('Sales & Bookings')).toBeDefined();
    });
  });
});
