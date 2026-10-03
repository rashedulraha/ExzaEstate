import { Injectable } from '@nestjs/common';
import type { SmsMessage, SmsProvider, SmsSendResult } from '../../ports/sms-provider.port.js';

@Injectable()
export class LocalSmsProvider implements SmsProvider {
  async send(message: SmsMessage): Promise<SmsSendResult> {
    return {
      messageId: `local-sms-${crypto.randomUUID()}`,
      status: 'SENT',
      rawResponse: {
        to: message.to,
        body: message.body,
        mode: 'local',
      },
    };
  }
}
