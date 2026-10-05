import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Drawer, Button } from '@exzaestate/ui';
import { useNotifications } from '../hooks/useNotifications.js';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreferences?: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const handleNotificationClick = async (item: (typeof notifications)[0]) => {
    if (!item.isRead) {
      await markAsRead(item.id);
    }

    const actionUrl = (item.data as Record<string, unknown> | null)?.actionUrl;
    if (typeof actionUrl === 'string' && actionUrl.startsWith('/')) {
      navigate(actionUrl);
      onClose();
    }
  };

  const getNotificationIcon = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'PAYMENT':
      case 'RECEIPT':
      case 'COLLECTION':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'APPROVAL':
      case 'SECURITY':
      case 'OVERDUE':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <Info className="w-4 h-4 text-info" />;
    }
  };

  const drawerSubtitle =
    unreadCount > 0
      ? `Real-time alerts and milestones (${unreadCount} unread)`
      : 'Real-time alerts and operational milestones';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      subtitle={drawerSubtitle}
      size="md"
    >
      <div className="space-y-4">
        {/* Controls: Filter & Mark All Read */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-caption font-medium transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-surface text-text shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded text-caption font-medium transition-colors cursor-pointer ${
                filter === 'unread'
                  ? 'bg-surface text-text shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void markAllAsRead()}
                leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-text-muted space-y-2">
              <Bell className="w-8 h-8 text-text-muted/40 mx-auto" />
              <p className="text-small font-medium text-text">No notifications to display</p>
              <p className="text-caption">
                {filter === 'unread'
                  ? 'You have caught up with all unread alerts.'
                  : 'No notification records exist in your inbox.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => void handleNotificationClick(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleNotificationClick(n);
                  }
                }}
                className={`p-3.5 rounded border transition-all cursor-pointer flex gap-3 text-left ${
                  n.isRead
                    ? 'bg-surface border-border opacity-75 hover:opacity-100 hover:border-border-strong'
                    : 'bg-primary/4 border-primary/20 hover:border-primary/40'
                }`}
              >
                <div className="mt-0.5 p-1.5 rounded bg-surface border border-border shrink-0">
                  {getNotificationIcon(n.category)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h5
                      className={`text-small truncate ${
                        n.isRead ? 'font-medium text-text' : 'font-semibold text-text'
                      }`}
                    >
                      {n.title}
                    </h5>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                  </div>

                  <p className="text-caption text-text-muted line-clamp-2 leading-relaxed">
                    {n.body}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {n.createdAt
                        ? new Date(n.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                    <span className="uppercase text-[10px] font-semibold tracking-wider text-text-muted">
                      {n.category}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Drawer>
  );
}
