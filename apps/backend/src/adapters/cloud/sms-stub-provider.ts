import { Injectable } from '@nestjs/common';
import type { SmsMessage, SmsProvider, SmsSendResult } from '../../ports/sms-provider.port.js';

@Injectable()
export class SmsStubProvider implements SmsProvider {
  async send(message: SmsMessage): Promise<SmsSendResult> {
    const messageId = `sms-${crypto.randomUUID()}`;
    return {
      messageId,
      status: 'SENT',
      rawResponse: {
        to: message.to,
        chars: message.body.length,
        dispatchedAt: new Date().toISOString(),
      },
    };
  }
}
