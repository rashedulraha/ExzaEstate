import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditLogViewerPage } from './pages/AuditLogViewerPage.js';
import { AuditDetailDrawer } from './components/AuditDetailDrawer.js';
import type { AuditLogRecord } from './types.js';

const mockAuditLogs: AuditLogRecord[] = [
  {
    id: 'audit-001',
    companyId: 'comp-1',
    actorId: 'usr-admin-1',
    module: 'sales',
    recordType: 'booking',
    recordId: '01912345-6789-7abc-def0-123456789abc',
    action: 'create',
    oldValue: null,
    newValue: { status: 'CONFIRMED', pricePaisa: '500000000' },
    reason: 'Customer completed down payment',
    ipAddress: '103.205.180.12',
    requestId: 'req-0192-3847',
    createdAt: '2026-10-05T10:00:00.000Z',
  },
];

const mockSecurityEvents = [
  {
    id: 'sec-001',
    companyId: 'comp-1',
    userId: 'usr-admin-1',
    eventType: 'LOGIN_SUCCESS',
    severity: 'INFO',
    details: { method: 'PASSWORD_2FA' },
    ipAddress: '103.205.180.12',
    userAgent: 'Mozilla/5.0 Chrome/128',
    requestId: 'req-sec-9912',
    createdAt: '2026-10-05T09:45:00.000Z',
  },
];

vi.mock('@exzaestate/api-client', () => ({
  useAuditControllerGetAuditLogs: () => ({
    data: { items: mockAuditLogs, total: 1, hasMore: false },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useAuditControllerGetSecurityEvents: () => ({
    data: { items: mockSecurityEvents, total: 1, hasMore: false },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import { MemoryRouter } from 'react-router';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Audit & Security Log Viewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuditLogViewerPage', () => {
    it('renders audit logs tab by default with records and columns', () => {
      renderWithRouter(<AuditLogViewerPage />);

      expect(screen.getByText('Audit & Security Event Viewer')).toBeDefined();
      expect(screen.getByText('Audit Trail (Mutations)')).toBeDefined();
      expect(screen.getByText('Security & Access Events')).toBeDefined();

      // Check table row content
      expect(screen.getByText('booking')).toBeDefined();
      expect(screen.getByText('create')).toBeDefined();
      expect(screen.getByText('Customer completed down payment')).toBeDefined();
    });

    it('switches to Security Events tab', () => {
      renderWithRouter(<AuditLogViewerPage />);

      const secTab = screen.getByText('Security & Access Events');
      fireEvent.click(secTab);

      expect(screen.getByText('LOGIN_SUCCESS')).toBeDefined();
      expect(screen.getByText('INFO')).toBeDefined();
    });

    it('opens AuditDetailDrawer when clicking Diff', () => {
      renderWithRouter(<AuditLogViewerPage />);

      const diffBtn = screen.getByRole('button', { name: /Diff/i });
      fireEvent.click(diffBtn);

      expect(screen.getByText('Audit Record Details')).toBeDefined();
      expect(screen.getByText(/State Changes Diff/i)).toBeDefined();
      expect(screen.getAllByText(/Customer completed down payment/i)[0]).toBeDefined();
    });
  });

  describe('AuditDetailDrawer', () => {
    it('renders full JSON diff between previous and resulting state', () => {
      const onClose = vi.fn();
      render(<AuditDetailDrawer isOpen={true} onClose={onClose} log={mockAuditLogs[0]!} />);

      expect(screen.getByText('Audit Record Details')).toBeDefined();
      expect(screen.getByText('Previous State (Before)')).toBeDefined();
      expect(screen.getByText('Resulting State (After)')).toBeDefined();
      expect(screen.getByText('(none - created)')).toBeDefined();
    });
  });
});
