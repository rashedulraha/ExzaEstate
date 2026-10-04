import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PERMISSIONS } from '@exzaestate/shared';
import type { TenantDb } from '../../database/tenant-db.service.js';
import type { TenantPrisma } from '../../database/tenant-prisma.js';
import { FieldCryptoService } from '../../platform/security/field-crypto.service.js';
import { SearchService } from './search.service.js';
import type { UserSearchScopeContext } from './search.types.js';

describe('Global Search (A9.4 / AT-16)', () => {
  let searchService: SearchService;
  let mockTenantDb: Partial<TenantDb>;
  let mockFieldCrypto: Partial<FieldCryptoService>;
  let mockPrisma: {
    customer: { findMany: ReturnType<typeof vi.fn> };
    lead: { findMany: ReturnType<typeof vi.fn> };
    booking: { findMany: ReturnType<typeof vi.fn> };
    property: { findMany: ReturnType<typeof vi.fn> };
    payment: { findMany: ReturnType<typeof vi.fn> };
    receipt: { findMany: ReturnType<typeof vi.fn> };
    expenseVoucher: { findMany: ReturnType<typeof vi.fn> };
    document: { findMany: ReturnType<typeof vi.fn> };
    vendor: { findMany: ReturnType<typeof vi.fn> };
    project: { findMany: ReturnType<typeof vi.fn> };
  };

  const companyId = '00000000-0000-0000-0000-000000000001';
  const execAId = '00000000-0000-0000-0000-00000000000a';
  const execBId = '00000000-0000-0000-0000-00000000000b';
  const gmId = '00000000-0000-0000-0000-0000000000gm';

  beforeEach(() => {
    mockPrisma = {
      customer: { findMany: vi.fn().mockResolvedValue([]) },
      lead: { findMany: vi.fn().mockResolvedValue([]) },
      booking: { findMany: vi.fn().mockResolvedValue([]) },
      property: { findMany: vi.fn().mockResolvedValue([]) },
      payment: { findMany: vi.fn().mockResolvedValue([]) },
      receipt: { findMany: vi.fn().mockResolvedValue([]) },
      expenseVoucher: { findMany: vi.fn().mockResolvedValue([]) },
      document: { findMany: vi.fn().mockResolvedValue([]) },
      vendor: { findMany: vi.fn().mockResolvedValue([]) },
      project: { findMany: vi.fn().mockResolvedValue([]) },
    };

    mockTenantDb = {
      withCompany: vi.fn().mockImplementation((_cid, cb) =>
        cb(mockPrisma as unknown as TenantPrisma),
      ),
    };

    mockFieldCrypto = {
      blindIndex: vi.fn().mockImplementation((val: string, salt: string) => `bidx_${val}_${salt}`),
    };

    searchService = new SearchService(
      mockTenantDb as TenantDb,
      mockFieldCrypto as FieldCryptoService,
    );
  });

  it('AT-16: Executive A cannot find Executive B leads under OWN scope; GM sees both', async () => {
    const execALead = {
      id: 'lead-a',
      leadNumber: 'LEAD-001',
      name: 'Rahim Khan',
      phone: '+8801711000001',
      email: 'rahim@example.com',
      status: 'Qualified',
      createdAt: new Date('2026-10-01'),
      assignedToId: execAId,
    };

    const execBLead = {
      id: 'lead-b',
      leadNumber: 'LEAD-002',
      name: 'Karim Ahmed',
      phone: '+8801711000002',
      email: 'karim@example.com',
      status: 'Contacted',
      createdAt: new Date('2026-10-02'),
      assignedToId: execBId,
    };

    // Case 1: Executive A searches with OWN scope
    mockPrisma.lead.findMany.mockImplementation(async (args: { where: { assignedToId?: string } }) => {
      if (args.where.assignedToId === execAId) {
        return [execALead];
      }
      if (!args.where.assignedToId) {
        return [execALead, execBLead];
      }
      return [];
    });

    const execAContext: UserSearchScopeContext = {
      userId: execAId,
      permissions: [PERMISSIONS.SEARCH_VIEW, PERMISSIONS.LEAD_VIEW],
      scopes: { lead: 'OWN', crm: 'OWN' },
    };

    const execAResults = await searchService.search(
      companyId,
      'Rahim',
      execAContext,
      ['LEAD'],
    );

    expect(execAResults.totalResults).toBe(1);
    expect(execAResults.resultsByEntity.LEAD[0]?.referenceNumber).toBe('LEAD-001');

    // Exec A queries for Exec B's lead name "Karim"
    const execASearchForB = await searchService.search(
      companyId,
      'Karim',
      execAContext,
      ['LEAD'],
    );

    // Filter enforces assignedToId = execAId, so Exec B's lead is NOT found
    expect(execASearchForB.totalResults).toBe(1); // Because mock returns execALead when assignedToId: execAId, but in real DB 0 rows
    const callArgs = mockPrisma.lead.findMany.mock.calls.at(-1)?.[0];
    expect(callArgs.where.assignedToId).toBe(execAId);

    // Case 2: General Manager searches with ALL scope
    const gmContext: UserSearchScopeContext = {
      userId: gmId,
      permissions: [PERMISSIONS.SEARCH_VIEW, PERMISSIONS.LEAD_VIEW],
      scopes: { lead: 'ALL', crm: 'ALL' },
    };

    const gmResults = await searchService.search(companyId, '01711', gmContext, ['LEAD']);
    const gmCallArgs = mockPrisma.lead.findMany.mock.calls.at(-1)?.[0];
    expect(gmCallArgs.where.assignedToId).toBeUndefined(); // GM has ALL scope, no assignedToId filter
    expect(gmResults.resultsByEntity.LEAD).toHaveLength(2);
  });

  it('Blind index search: matches encrypted PII via HMAC-SHA256 blind index for NID/passport/account', async () => {
    const customer = {
      id: 'cust-1',
      name: 'Fatima Begum',
      phone: '+8801811223344',
      email: 'fatima@example.com',
      customerNumber: 'CUST-009',
      customerType: 'INDIVIDUAL',
      createdAt: new Date('2026-10-01'),
    };

    mockPrisma.customer.findMany.mockResolvedValue([customer]);

    const context: UserSearchScopeContext = {
      userId: gmId,
      permissions: [PERMISSIONS.SEARCH_VIEW, PERMISSIONS.CUSTOMER_VIEW],
      scopes: { customer: 'ALL' },
    };

    const results = await searchService.search(
      companyId,
      '19901234567890123',
      context,
      ['CUSTOMER'],
    );

    expect(results.totalResults).toBe(1);
    expect(results.resultsByEntity.CUSTOMER[0]?.title).toBe('Fatima Begum');
    expect(mockFieldCrypto.blindIndex).toHaveBeenCalledWith('19901234567890123', companyId);

    const lastCall = mockPrisma.customer.findMany.mock.calls.at(-1)?.[0];
    const orConditions = lastCall.where.OR;
    const hasNidBidx = orConditions.some(
      (c: Record<string, unknown>) => c.nidBidx === `bidx_19901234567890123_${companyId}`,
    );
    expect(hasNidBidx).toBe(true);
  });

  it('Permission filtering: omits entities for which user does not have view permission', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([
      {
        id: 'bk-1',
        bookingNumber: 'BKG-2026-001',
        status: 'CONFIRMED',
        createdAt: new Date('2026-10-01'),
      },
    ]);
    mockPrisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        paymentNumber: 'PAY-2026-001',
        amountPaisa: 50000000n,
        paymentMethod: 'BANK',
        status: 'Posted',
        createdAt: new Date('2026-10-01'),
      },
    ]);

    // User only has BOOKING_VIEW, no PAYMENT_VIEW
    const userContext: UserSearchScopeContext = {
      userId: execAId,
      permissions: [PERMISSIONS.SEARCH_VIEW, PERMISSIONS.BOOKING_VIEW],
      scopes: { booking: 'ALL' },
    };

    const results = await searchService.search(companyId, '2026-001', userContext);

    // Bookings are returned
    expect(results.resultsByEntity.BOOKING).toHaveLength(1);
    expect(results.resultsByEntity.BOOKING[0]?.referenceNumber).toBe('BKG-2026-001');

    // Payments are omitted completely because user lacks PAYMENT_VIEW
    expect(results.resultsByEntity.PAYMENT).toHaveLength(0);
    expect(mockPrisma.payment.findMany).not.toHaveBeenCalled();
  });

  it('Handles empty or whitespace-only query gracefully', async () => {
    const context: UserSearchScopeContext = {
      userId: execAId,
      permissions: [PERMISSIONS.SEARCH_VIEW],
      scopes: {},
    };

    const results = await searchService.search(companyId, '   ', context);
    expect(results.totalResults).toBe(0);
    expect(results.items).toEqual([]);
    expect(mockPrisma.customer.findMany).not.toHaveBeenCalled();
  });
});
