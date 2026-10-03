export type UnsubscribeFn = () => Promise<void>;

/**
 * PubSub Port
 * Real-time event broadcasting (used by SSE stream and cluster sync).
 * Implemented by RedisPubSub in Cloud mode, and EventEmitterPubSub in Local mode.
 */
export interface PubSub {
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, handler: (message: string) => void): Promise<UnsubscribeFn>;
  close(): Promise<void>;
}
