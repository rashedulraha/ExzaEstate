import { Injectable, Optional } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { ConfigService } from '../../config/config.service.js';
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '../../ports/email-provider.port.js';

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;
  private readonly fromDefault: string;

  constructor(@Optional() config?: ConfigService) {
    void config;
    const host = process.env.SMTP_HOST || 'localhost';
    const port = Number(process.env.SMTP_PORT || 1025);
    const user = process.env.SMTP_USER || undefined;
    const pass = process.env.SMTP_PASSWORD || undefined;
    this.fromDefault = process.env.SMTP_FROM || 'no-reply@exzaestate.com';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const info = await this.transporter.sendMail({
      from: message.from || this.fromDefault,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      attachments: message.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });

    return {
      messageId: info.messageId || `smtp-${crypto.randomUUID()}`,
      status: 'SENT',
      rawResponse: info,
    };
  }
}
