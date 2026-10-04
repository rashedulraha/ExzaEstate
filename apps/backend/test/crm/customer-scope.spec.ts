import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { setupCrmTestContext, type CrmTestContext } from './crm-test.fixture.js';

describe('Customer Data Scoping & Multi-Tenancy (e2e)', () => {
  let ctx: CrmTestContext;
  let exec1CustomerId: string;

  beforeAll(async () => {
    ctx = await setupCrmTestContext();

    // Exec 1 creates a customer assigned to themselves
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        customerType: 'INDIVIDUAL',
        name: 'Exec 1 Own Customer',
        phone: '+8801712666001',
        nid: '19852692019283766',
      })
      .expect(201);

    exec1CustomerId = res.body.data.id;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('should allow Exec 1 to view customer assigned to them (OWN scope)', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${exec1CustomerId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(exec1CustomerId);
  });

  it('should block Exec 2 from viewing customer assigned to Exec 1 (OWN scope isolation)', async () => {
    await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${exec1CustomerId}`)
      .set('Authorization', `Bearer ${ctx.exec2Token}`)
      .expect(403);
  });

  it('should exclude other users customers from list when restricted to OWN scope', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${ctx.exec2Token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const found = res.body.data.some((c: { id: string }) => c.id === exec1CustomerId);
    expect(found).toBe(false);
  });

  it('should allow GM to view any customer in the company (ALL scope)', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${exec1CustomerId}`)
      .set('Authorization', `Bearer ${ctx.gmToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(exec1CustomerId);
  });

  it('should enforce strict multi-tenant isolation against Company B', async () => {
    // Company B user cannot view Company A's customer
    await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${exec1CustomerId}`)
      .set('Authorization', `Bearer ${ctx.companyBToken}`)
      .expect(404);
  });
});
