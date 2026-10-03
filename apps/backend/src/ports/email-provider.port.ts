export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export interface EmailSendResult {
  messageId: string;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  rawResponse?: unknown;
}

/**
 * EmailProvider Port
 * Transactional email delivery (SMTP/Mailpit/SES in cloud, in-app/log in local).
 */
export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
