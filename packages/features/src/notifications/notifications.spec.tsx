import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { NotificationDrawer } from './components/NotificationDrawer.js';
import { NotificationPreferencesModal } from './components/NotificationPreferencesModal.js';

const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockMutateAsync = vi.fn().mockResolvedValue({});

const mockNotifications = [
  {
    id: 'notif-1',
    title: 'Payment Cleared',
    body: '৳50,000 received for Plot 14',
    category: 'PAYMENT',
    isRead: false,
    createdAt: '2026-10-05T12:00:00.000Z',
    data: { actionUrl: '/collection/receipts' },
  },
  {
    id: 'notif-2',
    title: 'Booking Approved',
    body: 'Management approved booking BK-001',
    category: 'APPROVAL',
    isRead: true,
    createdAt: '2026-10-04T12:00:00.000Z',
  },
];

const mockPreferences = [
  {
    id: 'pref-1',
    eventCode: 'BOOKING_CREATED',
    eventName: 'Booking Created',
    module: 'sales',
    channel: 'IN_APP',
    enabled: true,
  },
  {
    id: 'pref-2',
    eventCode: 'BOOKING_CREATED',
    eventName: 'Booking Created',
    module: 'sales',
    channel: 'SMS',
    enabled: false,
  },
  {
    id: 'pref-3',
    eventCode: 'BOOKING_CREATED',
    eventName: 'Booking Created',
    module: 'sales',
    channel: 'EMAIL',
    enabled: true,
  },
];

vi.mock('./hooks/useNotifications.js', () => ({
  useNotifications: () => ({
    notifications: mockNotifications,
    unreadCount: 1,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    isConnected: true,
  }),
}));

vi.mock('@exzaestate/api-client', () => ({
  useNotificationsControllerGetPreferences: () => ({
    data: mockPreferences,
    isLoading: false,
  }),
  useNotificationsControllerUpdatePreferences: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe('Notifications System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NotificationDrawer', () => {
    it('renders notification list and unread count', () => {
      const onClose = vi.fn();

      render(
        <MemoryRouter>
          <NotificationDrawer isOpen={true} onClose={onClose} />
        </MemoryRouter>,
      );

      expect(screen.getByText('Notifications')).toBeDefined();
      expect(screen.getByText('Payment Cleared')).toBeDefined();
      expect(screen.getByText('Booking Approved')).toBeDefined();
      expect(screen.getByText('All (2)')).toBeDefined();
      expect(screen.getByText('Unread (1)')).toBeDefined();
    });

    it('filters between All and Unread', () => {
      const onClose = vi.fn();

      render(
        <MemoryRouter>
          <NotificationDrawer isOpen={true} onClose={onClose} />
        </MemoryRouter>,
      );

      // Click Unread filter
      const unreadFilter = screen.getByText('Unread (1)');
      fireEvent.click(unreadFilter);

      expect(screen.getByText('Payment Cleared')).toBeDefined();
      expect(screen.queryByText('Booking Approved')).toBeNull();
    });

    it('marks individual notification as read on click', async () => {
      const onClose = vi.fn();

      render(
        <MemoryRouter>
          <NotificationDrawer isOpen={true} onClose={onClose} />
        </MemoryRouter>,
      );

      const notifItem = screen.getByText('Payment Cleared');
      fireEvent.click(notifItem);

      await waitFor(() => {
        expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1');
      });
    });

    it('triggers markAllAsRead when button is clicked', async () => {
      const onClose = vi.fn();

      render(
        <MemoryRouter>
          <NotificationDrawer isOpen={true} onClose={onClose} />
        </MemoryRouter>,
      );

      const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
      fireEvent.click(markAllBtn);

      await waitFor(() => {
        expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('NotificationPreferencesModal', () => {
    it('renders channel preferences and saves on click', async () => {
      const onClose = vi.fn();

      render(<NotificationPreferencesModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText('Notification Delivery Preferences')).toBeDefined();
      expect(screen.getAllByText('Booking Created')[0]).toBeDefined();

      const saveBtn = screen.getByRole('button', { name: /Save Preferences/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });
  });
});
