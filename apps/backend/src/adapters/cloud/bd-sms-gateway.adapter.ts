import { Injectable, Logger } from '@nestjs/common';
import type { SmsMessage, SmsProvider, SmsSendResult } from '../../ports/sms-provider.port.js';

export interface BdSmsGatewayConfig {
  apiUrl?: string;
  apiKey?: string;
  senderId?: string;
}

@Injectable()
export class BdSmsGatewayAdapter implements SmsProvider {
  private readonly logger = new Logger(BdSmsGatewayAdapter.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor(config?: BdSmsGatewayConfig) {
    this.apiUrl = config?.apiUrl ?? process.env['SMS_GATEWAY_URL'] ?? 'https://api.sms-gateway.bd/v1/send';
    this.apiKey = config?.apiKey ?? process.env['SMS_GATEWAY_API_KEY'] ?? '';
    this.senderId = config?.senderId ?? process.env['SMS_SENDER_ID'] ?? 'ExzaEstate';
  }

  private normalizeBdPhone(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('880')) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('01')) {
      return `+88${cleaned}`;
    }
    return phone;
  }

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const normalizedTo = this.normalizeBdPhone(message.to);
    const messageId = `bd-sms-${crypto.randomUUID()}`;

    // If no real API key configured, act in mock/safe mode
    if (!this.apiKey || this.apiKey === 'mock') {
      this.logger.log(`[BdSmsGatewayAdapter MOCK] SMS to ${normalizedTo}: ${message.body}`);
      return {
        messageId,
        status: 'SENT',
        rawResponse: {
          mock: true,
          recipient: normalizedTo,
          senderId: this.senderId,
          length: message.body.length,
        },
      };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: normalizedTo,
          sender: this.senderId,
          text: message.body,
        }),
      });

      if (!response.ok) {
        throw new Error(`SMS Gateway responded with HTTP ${response.status}`);
      }

      const resBody = await response.json().catch(() => ({}));
      return {
        messageId,
        status: 'SENT',
        rawResponse: resBody,
      };
    } catch (err) {
      this.logger.error(`SMS send to ${normalizedTo} failed: ${String(err)}`);
      return {
        messageId,
        status: 'FAILED',
        rawResponse: { error: String(err) },
      };
    }
  }
}
