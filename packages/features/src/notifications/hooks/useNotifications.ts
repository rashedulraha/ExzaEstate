import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@exzaestate/app-core';
import {
  useNotificationsControllerGetInbox,
  useNotificationsControllerGetUnreadCount,
  useNotificationsControllerMarkAsRead,
  useNotificationsControllerMarkAllRead,
  getNotificationsControllerGetInboxQueryKey,
  getNotificationsControllerGetUnreadCountQueryKey,
  getAuthToken,
} from '@exzaestate/api-client';

export function useNotifications() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const inboxQuery = useNotificationsControllerGetInbox(
    { limit: 50 },
    {
      query: { enabled: isAuthenticated },
    },
  );
  const unreadCountQuery = useNotificationsControllerGetUnreadCount({
    query: { enabled: isAuthenticated },
  });

  const markReadMutation = useNotificationsControllerMarkAsRead();
  const markAllReadMutation = useNotificationsControllerMarkAllRead();

  // Real-time SSE Connection per architecture.md §8.4
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
        return;
      }
      try {
        const token = getAuthToken();
        const sseUrl = token
          ? `/api/v1/events/stream?token=${encodeURIComponent(token)}`
          : '/api/v1/events/stream';
        eventSource = new EventSource(sseUrl, {
          withCredentials: true,
        });

        eventSource.onopen = () => {
          // Connected to SSE stream
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'NOTIFICATION' || data?.eventName === 'notification.created') {
              // Invalidate queries to fetch fresh notifications immediately
              void queryClient.invalidateQueries({
                queryKey: getNotificationsControllerGetInboxQueryKey(),
              });
              void queryClient.invalidateQueries({
                queryKey: getNotificationsControllerGetUnreadCountQueryKey(),
              });
            }
          } catch {
            // Heartbeat or raw text comment
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          // Reconnect with 5s backoff
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch {
        // Fallback for environments where EventSource is unavailable (e.g. non-browser testing)
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, [queryClient, isAuthenticated]);

  const markAsRead = async (id: string) => {
    await markReadMutation.mutateAsync({ id });
    void queryClient.invalidateQueries({
      queryKey: getNotificationsControllerGetInboxQueryKey(),
    });
    void queryClient.invalidateQueries({
      queryKey: getNotificationsControllerGetUnreadCountQueryKey(),
    });
  };

  const markAllAsRead = async () => {
    await markAllReadMutation.mutateAsync();
    void queryClient.invalidateQueries({
      queryKey: getNotificationsControllerGetInboxQueryKey(),
    });
    void queryClient.invalidateQueries({
      queryKey: getNotificationsControllerGetUnreadCountQueryKey(),
    });
  };

  const inboxData = inboxQuery.data as
    | {
        items: Array<{
          id: string;
          companyId: string;
          userId: string;
          category: string;
          title: string;
          body: string;
          data: Record<string, unknown> | null;
          isRead: boolean;
          readAt: string | null;
          createdAt: string;
        }>;
        nextCursor: string | null;
        hasMore: boolean;
      }
    | undefined;

  return {
    notifications: inboxData?.items ?? [],
    unreadCount: unreadCountQuery.data?.count ?? 0,
    isLoading: inboxQuery.isLoading,
    isError: inboxQuery.isError,
    markAsRead,
    markAllAsRead,
    refetch: async () => {
      await Promise.all([inboxQuery.refetch(), unreadCountQuery.refetch()]);
    },
  };
}
