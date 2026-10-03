export interface SmsMessage {
  to: string; // Bangladeshi mobile e.g. +88017...
  body: string;
}

export interface SmsSendResult {
  messageId: string;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  rawResponse?: unknown;
}

/**
 * SmsProvider Port
 * SMS gateway dispatching (Bangladeshi SMS gateway adapter in cloud, stub/inbox in local).
 */
export interface SmsProvider {
  send(message: SmsMessage): Promise<SmsSendResult>;
}
