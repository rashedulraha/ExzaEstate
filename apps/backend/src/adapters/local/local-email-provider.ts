import { Injectable } from '@nestjs/common';
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '../../ports/email-provider.port.js';

@Injectable()
export class LocalEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    return {
      messageId: `local-email-${crypto.randomUUID()}`,
      status: 'SENT',
      rawResponse: {
        to: message.to,
        subject: message.subject,
        mode: 'local',
      },
    };
  }
}
