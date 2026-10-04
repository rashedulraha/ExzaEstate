import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { setupCrmTestContext, type CrmTestContext } from './crm-test.fixture.js';

describe('Customer Crypto, Blind Index & PII Masking (e2e)', () => {
  let ctx: CrmTestContext;
  let testCustomerId: string;
  const rawNid = '19852692019283741';
  const rawBankAccount = '1501204829100001';
  const rawTin = '482910482910';

  beforeAll(async () => {
    ctx = await setupCrmTestContext();

    // Create a customer with GM token so both GM and Exec1 can access or view
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .send({
        customerType: 'INDIVIDUAL',
        name: 'Crypto Verification Customer',
        phone: '+8801712888001',
        nid: rawNid,
        tin: rawTin,
        bankName: 'BRAC Bank PLC',
        bankAccount: rawBankAccount,
        nominees: [
          {
            name: 'Nominee User',
            relationship: 'WIFE',
            nid: '19882692019283742',
            sharePercentage: 100,
          },
        ],
      })
      .expect(201);

    testCustomerId = res.body.data.id;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('should store encrypted data in DB without plaintext leakage', async () => {
    const rawRow = await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      return tx.customer.findUniqueOrThrow({
        where: { id: testCustomerId },
      });
    });

    // Check encrypted format: starts with enc:v1:
    expect(rawRow.nidEncrypted?.startsWith('enc:v1:')).toBe(true);
    expect(rawRow.bankAccountEncrypted?.startsWith('enc:v1:')).toBe(true);
    expect(rawRow.tinEncrypted?.startsWith('enc:v1:')).toBe(true);

    // Assert absolute non-leakage of plaintext in DB columns
    expect(rawRow.nidEncrypted).not.toContain(rawNid);
    expect(rawRow.bankAccountEncrypted).not.toContain(rawBankAccount);
    expect(rawRow.tinEncrypted).not.toContain(rawTin);

    // Blind indexes should be 64-char HMAC-SHA256 hex strings
    expect(rawRow.nidBidx).toHaveLength(64);
    expect(rawRow.bankAccountBidx).toHaveLength(64);
    expect(rawRow.tinBidx).toHaveLength(64);
  });

  it('should find customer via blind index search without exposing cipher', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers?search=${rawNid}`)
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(testCustomerId);
    expect(res.body.data[0].name).toBe('Crypto Verification Customer');
  });

  it('should return empty array for non-existent blind index query', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/crm/customers?search=999999999999999999')
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('should mask PII when retrieved by user without customer:view-pii permission', async () => {
    // exec1 lacks customer:view-pii.
    // To allow exec1 to view this customer, assign it to exec1
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      await tx.customer.update({
        where: { id: testCustomerId },
        data: { assignedToId: ctx.exec1UserId },
      });
    });

    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // NID should be masked (ending with last 4 digits)
    expect(res.body.data.nid).toBe('******3741');
    expect(res.body.data.bankAccount).toBe('******0001');
    expect(res.body.data.tin).toBe('******2910');
    expect(res.body.data.nominees[0].nid).toBe('******3742');
  });

  it('should unmask PII and record an audit log when viewed with customer:view-pii permission', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.nid).toBe(rawNid);
    expect(res.body.data.bankAccount).toBe(rawBankAccount);
    expect(res.body.data.tin).toBe(rawTin);
    expect(res.body.data.nominees[0].nid).toBe('19882692019283742');

    // Verify audit log entry was created
    const auditLogs = await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      return tx.auditLog.findMany({
        where: {
          recordType: 'Customer',
          recordId: testCustomerId,
          action: 'CUSTOMER_PII_VIEW',
        },
      });
    });

    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    expect(auditLogs[0]?.actorId).toBe(ctx.gmUserId);
  });
});
