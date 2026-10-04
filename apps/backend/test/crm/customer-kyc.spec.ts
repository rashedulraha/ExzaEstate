import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { setupCrmTestContext, type CrmTestContext } from './crm-test.fixture.js';

describe('Customer KYC Evaluation & Verification (e2e)', () => {
  let ctx: CrmTestContext;
  let testCustomerId: string;

  beforeAll(async () => {
    ctx = await setupCrmTestContext();

    // Create individual customer missing both government ID and nominee
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .send({
        customerType: 'INDIVIDUAL',
        name: 'KYC Test Customer',
        phone: '+8801712777001',
        addresses: [
          {
            type: 'PRESENT',
            addressLine1: 'Road 11, Banani',
            city: 'Dhaka',
            isPrimary: true,
          },
        ],
      })
      .expect(201);

    testCustomerId = res.body.data.id;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('should return incomplete KYC evaluation when government ID and nominee are missing', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isKycCompleted).toBe(false);
    expect(res.body.data.kycStatus.isComplete).toBe(false);
    expect(res.body.data.kycStatus.missingRequirements).toContain(
      'At least one Government ID (NID, Passport, or TIN) is required',
    );
    expect(res.body.data.kycStatus.missingRequirements).toContain(
      'At least one registered nominee is required for individual customer',
    );
  });

  it('should reject verification when KYC requirements are incomplete', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${testCustomerId}/kyc-verify`)
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .send({
        notes: 'Attempting to verify incomplete KYC',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('KYC verification failed');
  });

  it('should reject verification if user lacks customer:verify-kyc permission', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${testCustomerId}/kyc-verify`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        notes: 'Executive attempting to verify KYC',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('should successfully verify KYC once all requirements are fulfilled', async () => {
    // 1. Add NID to customer
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/crm/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .send({
        nid: '19852692019283777',
      })
      .expect(200);

    // 2. Add registered nominee
    await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${testCustomerId}/nominees`)
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .send({
        name: 'Nominee Test',
        relationship: 'WIFE',
        nid: '19882692019283778',
        sharePercentage: 100,
      })
      .expect(201);

    // 3. Verify KYC now passes completeness check
    const checkRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .expect(200);

    expect(checkRes.body.data.kycStatus.isComplete).toBe(true);

    // 4. Verify KYC endpoint call
    const verifyRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${testCustomerId}/kyc-verify`)
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .send({
        notes: 'Verified original Smart NID and nominee document in person.',
      })
      .expect(200);

    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.id).toBe(testCustomerId);
    expect(verifyRes.body.data.isKycCompleted).toBe(true);
    expect(verifyRes.body.data.kycCompletedAt).toBeDefined();
    expect(verifyRes.body.data.kycCompletedById).toBe(ctx.gmUserId);
    expect(verifyRes.body.data.kycStatus.isVerified).toBe(true);
  });
});
