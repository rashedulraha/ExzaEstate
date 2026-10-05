import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Dialog, Button, LoadingState } from '@exzaestate/ui';
import {
  useNotificationsControllerGetPreferences,
  useNotificationsControllerUpdatePreferences,
  type NotificationPreferenceResponseDto,
  type UpdatePreferenceItemDtoChannel,
} from '@exzaestate/api-client';

export interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPreferencesModal({
  isOpen,
  onClose,
}: NotificationPreferencesModalProps) {
  const query = useNotificationsControllerGetPreferences();
  const updateMutation = useNotificationsControllerUpdatePreferences();

  const [preferences, setPreferences] = useState<NotificationPreferenceResponseDto[]>([]);

  useEffect(() => {
    if (query.data && preferences.length === 0) {
      setPreferences(query.data);
    }
  }, [query.data, preferences.length]);

  const handleToggle = (eventCode: string, channel: string) => {
    setPreferences((prev) =>
      prev.map((p) =>
        p.eventCode === eventCode && p.channel === channel ? { ...p, enabled: !p.enabled } : p,
      ),
    );
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      data: {
        preferences: preferences.map((p) => ({
          eventCode: p.eventCode,
          channel: p.channel as UpdatePreferenceItemDtoChannel,
          enabled: p.enabled,
        })),
      },
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Delivery Preferences"
      description="Toggle real-time channels across in-app, SMS, and email"
      size="md"
    >
      {query.isLoading && preferences.length === 0 ? (
        <LoadingState />
      ) : (
        <div className="space-y-4 py-2">
          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-left text-small">
              <thead className="bg-surface-sunken text-text-muted border-b border-border text-caption">
                <tr>
                  <th className="px-3 py-2 font-medium">Notification Event</th>
                  <th className="px-3 py-2 font-medium">Module</th>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 text-center font-medium">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {preferences.map((p) => (
                  <tr key={`${p.eventCode}-${p.channel}`} className="hover:bg-surface-sunken/40">
                    <td className="px-3 py-2.5 font-medium text-text">
                      {p.eventName || p.eventCode}
                    </td>
                    <td className="px-3 py-2.5 text-caption uppercase text-text-muted">
                      {p.module}
                    </td>
                    <td className="px-3 py-2.5 text-caption font-mono uppercase text-text">
                      {p.channel}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={() => handleToggle(p.eventCode, p.channel)}
                        className="rounded border-border text-primary cursor-pointer"
                        aria-label={`Toggle ${p.channel} for ${p.eventCode}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSave()}
              disabled={updateMutation.isPending}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
