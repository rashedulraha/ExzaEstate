import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { setupCrmTestContext, type CrmTestContext } from './crm-test.fixture.js';

describe('Customer CRUD & Relations API (e2e)', () => {
  let ctx: CrmTestContext;

  beforeAll(async () => {
    ctx = await setupCrmTestContext();
  });

  afterAll(async () => {
    await ctx.close();
  });

  let createdCustomerId: string;

  it('should create a customer with contacts, addresses, nominees and co-buyers', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        customerType: 'INDIVIDUAL',
        name: 'Engr. Farhan Ahmed',
        fatherOrSpouseName: 'Late Nurul Ahmed',
        motherName: 'Begum Rokeya Ahmed',
        dateOfBirth: '1985-06-15',
        occupation: 'Software Architect',
        nationality: 'Bangladeshi',
        isNrb: false,
        phone: '+8801712999001',
        email: 'farhan.crud@example.com',
        nid: '19852692019283741',
        tin: '482910482910',
        bankName: 'BRAC Bank PLC',
        bankBranch: 'Dhanmondi Branch',
        bankAccount: '1501204829100001',
        bankRoutingNumber: '060261234',
        contacts: [
          {
            name: 'Tasnim Farhan',
            relationship: 'Spouse',
            phone: '+8801712999002',
            isPrimary: true,
          },
        ],
        addresses: [
          {
            type: 'PRESENT',
            addressLine1: 'House 42, Road 9/A, Dhanmondi',
            city: 'Dhaka',
            postalCode: '1209',
            isPrimary: true,
          },
        ],
        nominees: [
          {
            name: 'Tasnim Farhan',
            relationship: 'WIFE',
            phone: '+8801712999002',
            nid: '19882692019283742',
            sharePercentage: 100,
          },
        ],
        coBuyers: [
          {
            name: 'Shahriar Ahmed',
            relationship: 'Brother',
            phone: '+8801712999003',
            nid: '19892692019283743',
            sharePercentage: 50,
          },
        ],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.customerNumber).toMatch(/^CUST-\d{4}-\d{6}$/);
    expect(res.body.data.name).toBe('Engr. Farhan Ahmed');
    expect(res.body.data.phone).toBe('+8801712999001');
    expect(res.body.data.isKycCompleted).toBe(false);

    createdCustomerId = res.body.data.id;
  });

  it('should prevent creating a customer with duplicate phone number', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Another Customer',
        phone: '+8801712999001',
      })
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it('should get customer 360 detail', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdCustomerId);
    expect(res.body.data.contacts).toHaveLength(1);
    expect(res.body.data.addresses).toHaveLength(1);
    expect(res.body.data.nominees).toHaveLength(1);
    expect(res.body.data.coBuyers).toHaveLength(1);
    expect(res.body.data.kycStatus).toBeDefined();
    expect(res.body.data.kycStatus.isVerified).toBe(false);
  });

  it('should update customer profile details', async () => {
    const res = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/crm/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        occupation: 'Principal Architect',
        email: 'farhan.updated@example.com',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.occupation).toBe('Principal Architect');
    expect(res.body.data.email).toBe('farhan.updated@example.com');
  });

  it('should add and soft delete a contact', async () => {
    const addRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${createdCustomerId}/contacts`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Secondary Contact',
        phone: '+8801712999004',
        relationship: 'Colleague',
      })
      .expect(201);

    expect(addRes.body.success).toBe(true);
    const contactId = addRes.body.data.id;

    const delRes = await request(ctx.app.getHttpServer())
      .delete(`/api/v1/crm/customers/${createdCustomerId}/contacts/${contactId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(200);

    expect(delRes.body.success).toBe(true);
  });

  it('should add and soft delete an address', async () => {
    const addRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${createdCustomerId}/addresses`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        type: 'OFFICE',
        addressLine1: 'Level 5, Gulshan Tower',
        city: 'Dhaka',
      })
      .expect(201);

    expect(addRes.body.success).toBe(true);
    const addressId = addRes.body.data.id;

    const delRes = await request(ctx.app.getHttpServer())
      .delete(`/api/v1/crm/customers/${createdCustomerId}/addresses/${addressId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(200);

    expect(delRes.body.success).toBe(true);
  });

  it('should add and soft delete a nominee', async () => {
    const addRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${createdCustomerId}/nominees`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Aryan Farhan',
        relationship: 'SON',
        nid: '20152692019283749',
        sharePercentage: 50,
      })
      .expect(201);

    expect(addRes.body.success).toBe(true);
    const nomineeId = addRes.body.data.id;

    const delRes = await request(ctx.app.getHttpServer())
      .delete(`/api/v1/crm/customers/${createdCustomerId}/nominees/${nomineeId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(200);

    expect(delRes.body.success).toBe(true);
  });

  it('should add and soft delete a co-buyer', async () => {
    const addRes = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${createdCustomerId}/co-buyers`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        name: 'Kashfia Ahmed',
        relationship: 'Sister',
        phone: '+8801712999005',
        nid: '19922692019283750',
        sharePercentage: 50,
      })
      .expect(201);

    expect(addRes.body.success).toBe(true);
    const coBuyerId = addRes.body.data.id;

    const delRes = await request(ctx.app.getHttpServer())
      .delete(`/api/v1/crm/customers/${createdCustomerId}/co-buyers/${coBuyerId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(200);

    expect(delRes.body.success).toBe(true);
  });

  it('should attach a document to customer', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/api/v1/crm/customers/${createdCustomerId}/documents`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .send({
        category: 'NATIONAL_ID',
        title: 'NID Smart Card Front & Back',
        fileName: 'farhan-nid.pdf',
        fileKey: 'customers/farhan-nid.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048576,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.title).toBe('NID Smart Card Front & Back');
  });

  it('should soft-delete customer', async () => {
    const res = await request(ctx.app.getHttpServer())
      .delete(`/api/v1/crm/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdCustomerId);

    // Verify it is not found anymore
    await request(ctx.app.getHttpServer())
      .get(`/api/v1/crm/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${ctx.exec1Token}`)
      .expect(404);
  });
});
