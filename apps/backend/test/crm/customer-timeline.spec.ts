import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupCrmTestContext, type CrmTestContext } from './crm-test.fixture.js';

describe('Customer Activity Timeline (Task A3.4 / S2)', () => {
  let ctx: CrmTestContext;

  beforeAll(async () => {
    ctx = await setupCrmTestContext();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('aggregates and chronologically orders all customer events from lead origin, follow-ups, KYC, and documents', async () => {
    // 1. Create a lead
    const createLeadRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Mahmudur Rahman',
        phone: '+8801712999885',
        email: 'mahmudur@example.com',
        source: 'Walk-in',
      });
    expect(createLeadRes.status).toBe(201);
    const leadId = createLeadRes.body.data.id;

    // 2. Change lead status: New -> Contacted
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/crm/leads/${leadId}/status`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        toStatus: 'Contacted',
        reason: 'Initial phone call completed',
      });

    // 3. Log a follow-up
    const followUpRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/follow-ups')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        leadId,
        type: 'SITE_VISIT',
        priority: 'HIGH',
        dueDate: '2026-10-20',
        notes: 'Project visit to Gulshan Lakeview',
      });
    expect(followUpRes.status).toBe(201);
    const followUpId = followUpRes.body.data.id;

    // 4. Complete the follow-up
    await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/follow-ups/${followUpId}/complete`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        outcome: 'Customer liked the South-facing 2400 sqft unit',
      });

    // 5. Convert lead to customer
    const convertRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        customerType: 'INDIVIDUAL',
        nid: '19882692019283743',
        occupation: 'Doctor',
        addressLine1: 'Road 11, Banani',
        city: 'Dhaka',
      });
    expect(convertRes.status).toBe(200);
    const customerId = convertRes.body.data.id;

    // 6. Attach a document to customer
    const docRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${customerId}/documents`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        title: 'Customer NID Copy',
        category: 'KYC',
        fileKey: 'customers/nid-copy.pdf',
        fileName: 'nid-copy.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 204850,
      });
    expect(docRes.status).toBe(201);

    // 6b. Add a nominee to fulfill KYC requirements
    const nomineeRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${customerId}/nominees`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Nasrin Rahman',
        relationship: 'Spouse',
        phone: '+8801712999889',
        sharePercentage: 100,
      });
    expect(nomineeRes.status).toBe(201);

    // 7. Verify KYC for customer via GM
    const kycRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${customerId}/kyc-verify`)
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .send({
        notes: 'NID and physical address verified',
      });
    expect(kycRes.status).toBe(200);

    // 8. Query timeline
    const timelineRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${customerId}/timeline`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`);

    expect(timelineRes.status).toBe(200);
    const timeline = timelineRes.body.data;
    expect(timeline.customerId).toBe(customerId);
    expect(timeline.customerNumber).toBeDefined();
    expect(timeline.totalEvents).toBeGreaterThanOrEqual(6);
    expect(timeline.items).toBeInstanceOf(Array);

    const eventTypes = timeline.items.map((i: { type: string }) => i.type);
    expect(eventTypes).toContain('LEAD_CAPTURED');
    expect(eventTypes).toContain('LEAD_STATUS_CHANGED');
    expect(eventTypes).toContain('FOLLOW_UP_SCHEDULED');
    expect(eventTypes).toContain('FOLLOW_UP_COMPLETED');
    expect(eventTypes).toContain('LEAD_CONVERTED');
    expect(eventTypes).toContain('DOCUMENT_ATTACHED');
    expect(eventTypes).toContain('KYC_VERIFIED');

    // Verify chronological order (newest first)
    for (let i = 0; i < timeline.items.length - 1; i++) {
      const current = new Date(timeline.items[i].timestamp).getTime();
      const next = new Date(timeline.items[i + 1].timestamp).getTime();
      expect(current).toBeGreaterThanOrEqual(next);
    }

    // Verify actor name resolution
    const itemWithActor = timeline.items.find(
      (i: { actorId?: string | null }) => i.actorId !== null,
    );
    if (itemWithActor) {
      expect(itemWithActor.actorName).toBeDefined();
      expect(typeof itemWithActor.actorName).toBe('string');
    }
  });

  it('records CUSTOMER_CREATED for directly created customers without lead origin', async () => {
    const createRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .send({
        customerType: 'INDIVIDUAL',
        name: 'Direct VIP Customer',
        phone: '+8801712999886',
      });

    expect(createRes.status).toBe(201);
    const customerId = createRes.body.data.id;

    const timelineRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${customerId}/timeline`)
      .set('Authorization', `Bearer ${ctx.gmToken}`);

    expect(timelineRes.status).toBe(200);
    const eventTypes = timelineRes.body.data.items.map((i: { type: string }) => i.type);
    expect(eventTypes).toContain('CUSTOMER_CREATED');
  });

  it('enforces multi-tenancy: Company B cannot view timeline of Company A customer', async () => {
    const createRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        customerType: 'INDIVIDUAL',
        name: 'Company A Only Customer',
        phone: '+8801712999887',
      });

    const customerId = createRes.body.data.id;

    const isolatedRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${customerId}/timeline`)
      .set('Authorization', `Bearer ${ctx.companyBToken}`);

    expect(isolatedRes.status).toBe(404);
  });
});
