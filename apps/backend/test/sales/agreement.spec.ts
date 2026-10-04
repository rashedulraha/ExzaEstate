import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BOOKING_STATUSES, ERROR_CODES, PROPERTY_STATUSES } from '@exzaestate/shared';
import { type SalesTestContext, setupSalesTestContext } from './sales-test.fixture.js';

describe('A5.4 — Agreement Generation, Locking & Versioning', () => {
  let ctx: SalesTestContext;
  let testCustomerId: string;
  let testPlanTemplateId: string;
  let confirmedBookingId: string;
  let confirmedBookingNumber: string;
  let requestedBookingId: string;
  let propertyId1: string;
  let propertyId2: string;

  beforeAll(async () => {
    ctx = await setupSalesTestContext();

    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      const project = await tx.project.create({
        data: {
          companyId: ctx.companyAId,
          code: 'PRJ-AGR-01',
          name: 'Bay View Heights',
          type: 'RESIDENTIAL',
          status: 'UPCOMING',
        },
      });

      const customer = await tx.customer.create({
        data: {
          companyId: ctx.companyAId,
          customerNumber: 'CUST-AGR-001',
          name: 'Shahidul Alam',
          phone: '+8801719998888',
          customerType: 'INDIVIDUAL',
        },
      });
      testCustomerId = customer.id;

      const template = await tx.paymentPlanTemplate.create({
        data: {
          companyId: ctx.companyAId,
          code: 'PPT-AGR-01',
          name: 'Standard Agreement Plan',
          planType: 'CUSTOM',
          minBookingPct: 10.0,
          downPaymentPct: 10.0,
          frequency: 'MONTHLY',
          installmentCount: 12,
        },
      });
      testPlanTemplateId = template.id;

      const prop1 = await tx.property.create({
        data: {
          companyId: ctx.companyAId,
          projectId: project.id,
          code: 'APT-AGR-101',
          title: 'Deluxe Suite 101',
          type: 'APARTMENT',
          status: PROPERTY_STATUSES.AVAILABLE,
          areaSqft: 2150,
          basePricePaisa: 15_000_000_0n,
          netPricePaisa: 15_000_000_0n,
        },
      });
      propertyId1 = prop1.id;

      const prop2 = await tx.property.create({
        data: {
          companyId: ctx.companyAId,
          projectId: project.id,
          code: 'APT-AGR-102',
          title: 'Executive Suite 102',
          type: 'APARTMENT',
          status: PROPERTY_STATUSES.AVAILABLE,
          areaSqft: 1850,
          basePricePaisa: 12_000_000_0n,
          netPricePaisa: 12_000_000_0n,
        },
      });
      propertyId2 = prop2.id;
    });

    const createBkgRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/sales/bookings')
      .set('Authorization', `Bearer ${ctx.execToken}`)
      .send({
        propertyId: propertyId1,
        customerId: testCustomerId,
        paymentPlanTemplateId: testPlanTemplateId,
        notes: 'Pre-confirmed booking for agreement',
      });
    expect(createBkgRes.status).toBe(HttpStatus.CREATED);
    confirmedBookingId = createBkgRes.body.data.id;
    confirmedBookingNumber = createBkgRes.body.data.bookingNumber;

    await ctx.tenantDb.withCompany(ctx.companyAId, async (tx) => {
      await tx.booking.update({
        where: { id: confirmedBookingId },
        data: { status: BOOKING_STATUSES.CONFIRMED, confirmedAt: new Date() },
      });
      await tx.property.update({
        where: { id: propertyId1 },
        data: { status: PROPERTY_STATUSES.BOOKED },
      });
    });

    const createReqRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/sales/bookings')
      .set('Authorization', `Bearer ${ctx.execToken}`)
      .send({
        propertyId: propertyId2,
        customerId: testCustomerId,
        paymentPlanTemplateId: testPlanTemplateId,
        notes: 'Unconfirmed booking',
      });
    expect(createReqRes.status).toBe(HttpStatus.CREATED);
    requestedBookingId = createReqRes.body.data.id;
  });

  afterAll(async () => {
    if (ctx) await ctx.close();
  });

  describe('S1: Agreement Templates & Generation', () => {
    let customTemplateId: string;

    it('creates and lists agreement templates', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/agreements/templates')
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          code: 'AGR_ALLOT_SUITE',
          name: 'Premium Suite Allotment Deed',
          templateBody:
            'Deed for {{property_title}} allotted to {{customer_name}} under Ref {{booking_number}}. Price: {{net_price}}.',
          isDefault: true,
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('AGR_ALLOT_SUITE');
      customTemplateId = res.body.data.id;

      const listRes = await request(ctx.app.getHttpServer())
        .get('/api/v1/sales/agreements/templates')
        .set('Authorization', `Bearer ${ctx.execToken}`);

      expect(listRes.status).toBe(HttpStatus.OK);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
      const found = listRes.body.data.find((t: { id: string }) => t.id === customTemplateId);
      expect(found).toBeDefined();
    });

    it('rejects agreement generation on an unconfirmed booking (REQUESTED)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/agreements/generate')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({ bookingId: requestedBookingId, title: 'Premature Agreement Attempt' });

      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(res.body.error.code).toBe(ERROR_CODES.INVALID_STATE_TRANSITION);
    });

    it('generates an agreement from confirmed booking and transitions booking to AGREEMENT_PENDING', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/sales/agreements/generate')
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          bookingId: confirmedBookingId,
          templateId: customTemplateId,
          title: 'Official Deed of Allotment',
          terms: 'Handover within 24 months of registration',
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Generated');
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.agreementNumber).toMatch(/^AGR-\d{4}-\d{5}$/);
      expect(res.body.data.content).toContain('Deluxe Suite 101');
      expect(res.body.data.content).toContain('Shahidul Alam');
      expect(res.body.data.content).toContain(confirmedBookingNumber);

      const booking = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.booking.findUniqueOrThrow({ where: { id: confirmedBookingId } }),
      );
      expect(booking.status).toBe(BOOKING_STATUSES.AGREEMENT_PENDING);

      const history = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.bookingStatusHistory.findMany({
          where: { bookingId: confirmedBookingId },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(history[0]?.fromStatus).toBe(BOOKING_STATUSES.CONFIRMED);
      expect(history[0]?.toStatus).toBe(BOOKING_STATUSES.AGREEMENT_PENDING);
    });
  });

  describe('S2 & S3: Editing, Signing, Locking & Immutability', () => {
    let agreementId: string;

    beforeAll(async () => {
      const list = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.agreement.findMany({ where: { bookingId: confirmedBookingId } }),
      );
      agreementId = list[0]?.id ?? '';
    });

    it('forbids an Executive without agreement:edit permission from updating agreement (403)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .put(`/api/v1/sales/agreements/${agreementId}`)
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({ title: 'Executive edit attempt' });

      expect(res.status).toBe(HttpStatus.FORBIDDEN);
      expect(res.body.error.code).toBe(ERROR_CODES.FORBIDDEN);
    });

    it('allows updating an agreement while in Generated status with agreement:edit permission', async () => {
      const res = await request(ctx.app.getHttpServer())
        .put(`/api/v1/sales/agreements/${agreementId}`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({
          title: 'Deed of Allotment (Reviewed)',
          notes: 'Legal review passed with clause 7 updated',
        });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Deed of Allotment (Reviewed)');
    });

    it('signs and locks agreement, advancing booking to AGREEMENT_COMPLETED', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/sales/agreements/${agreementId}/sign-and-lock`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({ notes: 'Signed in presence of notary public' });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Signed & Locked');
      expect(res.body.data.signedAt).toBeDefined();

      const booking = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.booking.findUniqueOrThrow({ where: { id: confirmedBookingId } }),
      );
      expect(booking.status).toBe(BOOKING_STATUSES.AGREEMENT_COMPLETED);
    });

    it('REJECTS any edit attempt on a locked agreement (a locked agreement can never be edited)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .put(`/api/v1/sales/agreements/${agreementId}`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({ title: 'Illicit Modification Attempt' });

      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(res.body.error.code).toBe(ERROR_CODES.INVALID_STATE_TRANSITION);
      expect(res.body.error.message).toContain('Locked agreements cannot be edited');
    });

    it('creates a new version from a locked agreement, marking prior as Superseded', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/sales/agreements/${agreementId}/version`)
        .set('Authorization', `Bearer ${ctx.execToken}`)
        .send({
          reason: 'Client requested addition of car parking space clause',
          title: 'Deed of Allotment (Addendum 1)',
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.status).toBe('Generated');
      const newVersionId = res.body.data.id;

      const original = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.agreement.findUniqueOrThrow({ where: { id: agreementId } }),
      );
      expect(original.status).toBe('Superseded');
      expect(original.supersededById).toBe(newVersionId);

      const booking = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.booking.findUniqueOrThrow({ where: { id: confirmedBookingId } }),
      );
      expect(booking.status).toBe(BOOKING_STATUSES.AGREEMENT_PENDING);

      const editSupersededRes = await request(ctx.app.getHttpServer())
        .put(`/api/v1/sales/agreements/${agreementId}`)
        .set('Authorization', `Bearer ${ctx.mdToken}`)
        .send({ title: 'Tampering superseded' });
      expect(editSupersededRes.status).toBe(HttpStatus.CONFLICT);
    });
  });

  describe('S4: PDF & Security Isolation', () => {
    it('downloads branded institutional PDF for agreement', async () => {
      const list = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.agreement.findMany({
          where: { bookingId: confirmedBookingId },
          orderBy: { version: 'desc' },
        }),
      );
      const agreementId = list[0]?.id ?? '';

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/agreements/${agreementId}/pdf`)
        .set('Authorization', `Bearer ${ctx.execToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body).toBeDefined();
    });

    it('enforces multi-tenant RLS isolation: Company B cannot access Company A agreement', async () => {
      const list = await ctx.tenantDb.withCompany(ctx.companyAId, (tx) =>
        tx.agreement.findMany({ where: { bookingId: confirmedBookingId } }),
      );
      const agreementId = list[0]?.id ?? '';

      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/sales/agreements/${agreementId}`)
        .set('Authorization', `Bearer ${ctx.companyBToken}`);

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });
  });
});
