export interface RealtimeEvent {
  id: string;
  eventName: string;
  companyId: string;
  userId?: string | null;
  requiredPermission?: string | null;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface RealtimeClient {
  id: string;
  companyId: string;
  userId: string;
  permissions: Set<string>;
  send: (event: RealtimeEvent) => void;
  sendComment: (comment: string) => void;
  close: () => void;
}
