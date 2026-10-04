import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { TenantDb } from '../../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import type { EmailProvider, SmsProvider } from '../../../ports/index.js';
import { NotificationDeliveryService } from './notification-delivery.service.js';
import { NotificationDeliveryWorker } from './notification-delivery.worker.js';

describe('Notification Delivery & Worker (A9.2 S1, S2)', () => {
  let deliveryService: NotificationDeliveryService;
  let deliveryWorker: NotificationDeliveryWorker;
  let mockTenantDb: Partial<TenantDb>;
  let mockSmsProvider: Partial<SmsProvider>;
  let mockEmailProvider: Partial<EmailProvider>;
  let mockNotificationLog: { create: ReturnType<typeof vi.fn> };

  const companyId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    mockNotificationLog = {
      create: vi.fn().mockResolvedValue({ id: 'log-1', createdAt: new Date() }),
    };

    mockTenantDb = {
      withCompany: vi.fn().mockImplementation((_cid, cb) =>
        cb({
          notificationLog: mockNotificationLog,
        } as unknown as TenantPrisma),
      ),
    };

    mockSmsProvider = {
      send: vi.fn().mockResolvedValue({
        messageId: 'sms-123',
        status: 'SENT',
      }),
    };

    mockEmailProvider = {
      send: vi.fn().mockResolvedValue({
        messageId: 'email-123',
        status: 'SENT',
      }),
    };

    deliveryService = new NotificationDeliveryService(
      mockTenantDb as TenantDb,
      mockSmsProvider as SmsProvider,
      mockEmailProvider as EmailProvider,
    );

    deliveryWorker = new NotificationDeliveryWorker(deliveryService);
  });

  it('dispatches SMS through SmsProvider and logs to notification_logs as SENT', async () => {
    const result = await deliveryService.dispatchSms(
      companyId,
      '+8801711223344',
      'Your installment of ৳50,000 is due on 15 Oct',
      { recipientId: 'user-1' },
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('sms-123');
    expect(mockSmsProvider.send).toHaveBeenCalledWith({
      to: '+8801711223344',
      body: 'Your installment of ৳50,000 is due on 15 Oct',
    });
    expect(mockNotificationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId,
          channel: 'SMS',
          status: 'SENT',
          recipientId: 'user-1',
        }),
      }),
    );
  });

  it('dispatches Email through EmailProvider and logs to notification_logs as SENT', async () => {
    const result = await deliveryService.dispatchEmail(
      companyId,
      'buyer@example.com',
      'Money Receipt MR-2026-001',
      '<p>Thank you for your payment</p>',
      'Thank you for your payment',
      { recipientId: 'user-2' },
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('email-123');
    expect(mockEmailProvider.send).toHaveBeenCalled();
    expect(mockNotificationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId,
          channel: 'EMAIL',
          status: 'SENT',
          recipientId: 'user-2',
        }),
      }),
    );
  });

  it('records FAILED status in notification_logs when provider fails', async () => {
    mockSmsProvider.send = vi.fn().mockRejectedValue(new Error('Gateway timeout'));

    const result = await deliveryService.dispatchSms(
      companyId,
      '+8801711223344',
      'Test message',
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Gateway timeout');
    expect(mockNotificationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId,
          channel: 'SMS',
          status: 'FAILED',
          error: 'Gateway timeout',
        }),
      }),
    );
  });

  it('NotificationDeliveryWorker processes jobs and retries on failure', async () => {
    mockSmsProvider.send = vi.fn().mockRejectedValue(new Error('Temporary network glitch'));

    const retrySuccess = await deliveryWorker.process({
      companyId,
      channel: 'SMS',
      destination: '+8801711223344',
      body: 'Test notification',
      attempts: 1,
      maxAttempts: 3,
    });

    // Should indicate failure so the queue driver retries the job
    expect(retrySuccess).toBe(false);
  });
});
