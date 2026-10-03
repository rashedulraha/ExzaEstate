import { randomUUID } from 'node:crypto';
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.refreshToken',
      '*.accessToken',
      '*.secret',
      '*.jwt',
      '*.nid',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function generateRequestId(): string {
  return randomUUID();
}
