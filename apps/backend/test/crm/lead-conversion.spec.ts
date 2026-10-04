import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { DOMAIN_EVENTS, LEAD_STATUSES } from '@exzaestate/shared';
import { setupCrmTestContext, type CrmTestContext } from './crm-test.fixture.js';

describe('Lead→Customer Conversion (Task A3.4 / FLOW-05 / S1)', () => {
  let ctx: CrmTestContext;

  beforeAll(async () => {
    ctx = await setupCrmTestContext();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('converts a lead to a customer in one atomic transaction, updating follow-ups and preserving lead history', async () => {
    // 1. Create a lead under Exec 1
    const createLeadRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Tariqul Islam',
        phone: '+8801712999881',
        email: 'tariqul@example.com',
        source: 'Facebook',
        interestNotes: 'Interested in 3-bedroom apartment in Dhanmondi',
      });

    expect(createLeadRes.status).toBe(201);
    const leadId = createLeadRes.body.data.id;
    expect(createLeadRes.body.data.leadNumber).toMatch(/^LEAD-\d{4}-\d{6}$/);

    // 2. Add a follow-up for this lead
    const createFollowUpRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/follow-ups')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        leadId,
        type: 'MEETING',
        priority: 'HIGH',
        dueDate: '2026-10-15',
        notes: 'Discussion regarding floor plan and payment plan',
      });

    expect(createFollowUpRes.status).toBe(201);
    const followUpId = createFollowUpRes.body.data.id;

    // 3. Convert lead to customer
    const convertRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        customerType: 'INDIVIDUAL',
        fatherOrSpouseName: 'Rafiqul Islam',
        occupation: 'Software Architect',
        nid: '19872692019283742',
        addressLine1: 'House 42, Road 7A, Dhanmondi',
        city: 'Dhaka',
        division: 'Dhaka Division',
        postalCode: '1209',
        notes: 'Customer agreed on terms, moving to quotation',
      });

    expect(convertRes.status).toBe(200);
    const customer = convertRes.body.data;
    expect(customer.id).toBeDefined();
    expect(customer.customerNumber).toMatch(/^CUST-\d{4}-\d{6}$/);
    expect(customer.name).toBe('Tariqul Islam');
    expect(customer.phone).toBe('+8801712999881');
    expect(customer.leadId).toBe(leadId);
    expect(customer.fatherOrSpouseName).toBe('Rafiqul Islam');
    expect(customer.occupation).toBe('Software Architect');

    // 4. Verify Database state in TenantDb
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      // Customer record
      const dbCustomer = await tx.customer.findUniqueOrThrow({
        where: { id: customer.id },
        include: { contacts: true, addresses: true },
      });
      expect(dbCustomer.nidEncrypted).not.toBeNull();
      expect(dbCustomer.nidEncrypted).not.toBe('19872692019283742'); // encrypted at rest
      expect(dbCustomer.nidBidx).not.toBeNull();
      expect(dbCustomer.contacts.length).toBeGreaterThanOrEqual(1);
      expect(dbCustomer.contacts[0]?.isPrimary).toBe(true);
      expect(dbCustomer.addresses.length).toBeGreaterThanOrEqual(1);
      expect(dbCustomer.addresses[0]?.city).toBe('Dhaka');

      // Follow-up now linked to customer
      const dbFollowUp = await tx.followUp.findUniqueOrThrow({
        where: { id: followUpId },
      });
      expect(dbFollowUp.customerId).toBe(customer.id);
      expect(dbFollowUp.leadId).toBe(leadId);

      // Lead status updated to Customer, NOT deleted
      const dbLead = await tx.lead.findUniqueOrThrow({
        where: { id: leadId },
        include: { statusHistory: true },
      });
      expect(dbLead.deletedAt).toBeNull(); // history intact
      expect(dbLead.status).toBe(LEAD_STATUSES.CUSTOMER);
      const lastHistory = dbLead.statusHistory[dbLead.statusHistory.length - 1];
      expect(lastHistory?.toStatus).toBe(LEAD_STATUSES.CUSTOMER);

      // Audit logs
      const leadAudit = await tx.auditLog.findFirst({
        where: { recordType: 'Lead', recordId: leadId, action: 'LEAD_CONVERTED' },
      });
      expect(leadAudit).not.toBeNull();

      const customerAudit = await tx.auditLog.findFirst({
        where: { recordType: 'Customer', recordId: customer.id, action: 'CRM_CUSTOMER_CREATE' },
      });
      expect(customerAudit).not.toBeNull();

      // Outbox events
      const outboxEvents = await tx.outboxEvent.findMany({
        where: {
          companyId: ctx.companyAId,
          eventName: { in: [DOMAIN_EVENTS.LEAD_CONVERTED, DOMAIN_EVENTS.CUSTOMER_CREATED] },
        },
      });
      expect(outboxEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('conversion is idempotent: converting an already-converted lead returns the existing customer without creating duplicates', async () => {
    // 1. Create a lead
    const createLeadRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Rehana Parveen',
        phone: '+8801712999882',
        source: 'Website',
      });

    const leadId = createLeadRes.body.data.id;

    // 2. First conversion
    const firstConvert = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        customerType: 'INDIVIDUAL',
        city: 'Dhaka',
        addressLine1: 'Banani DOHS',
      });

    expect(firstConvert.status).toBe(200);
    const customerId = firstConvert.body.data.id;
    const customerNumber = firstConvert.body.data.customerNumber;

    // 3. Second conversion attempt (idempotency check)
    const secondConvert = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        customerType: 'INDIVIDUAL',
        city: 'Dhaka',
      });

    expect(secondConvert.status).toBe(200);
    expect(secondConvert.body.data.id).toBe(customerId);
    expect(secondConvert.body.data.customerNumber).toBe(customerNumber);

    // Verify only 1 customer was created for this lead
    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const customers = await tx.customer.findMany({
        where: { companyId: ctx.companyAId, leadId, deletedAt: null },
      });
      expect(customers.length).toBe(1);
    });
  });

  it('enforces RBAC data scoping: Executive with OWN scope cannot convert another executives lead', async () => {
    // 1. Exec 1 creates a lead (assigned to Exec 1)
    const createLeadRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Private Lead of Exec 1',
        phone: '+8801712999883',
        source: 'Referral',
      });

    const leadId = createLeadRes.body.data.id;

    // 2. Exec 2 (with OWN scope) attempts to convert Exec 1's lead
    const forbiddenRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${ctx.exec2Token}`)
      .send({ customerType: 'INDIVIDUAL' });

    expect([403, 404]).toContain(forbiddenRes.status);

    // 3. GM (with ALL scope) can convert Exec 1's lead
    const gmConvertRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .send({ customerType: 'INDIVIDUAL' });

    expect(gmConvertRes.status).toBe(200);
    expect(gmConvertRes.body.data.leadId).toBe(leadId);
  });

  it('returns 404 when attempting to convert a non-existent lead', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/leads/01a10000-0000-0000-0000-000000000000/convert')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({ customerType: 'INDIVIDUAL' });

    expect(res.status).toBe(404);
  });
});
