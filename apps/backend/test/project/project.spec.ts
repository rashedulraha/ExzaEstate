import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProjectTestContext, setupProjectTest } from './project-test.helper.js';

describe('Project Master & Lifecycle (Task A1.4 - S1, S3)', () => {
  let ctx: ProjectTestContext;
  let createdProjectId: string;
  let createdProjectCode: string;

  beforeAll(async () => {
    ctx = await setupProjectTest();
    createdProjectCode = `PRJ-${Date.now().toString().slice(-4)}`;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('POST /api/v1/projects - creates project with linked land and auto cost center', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        code: createdProjectCode,
        name: 'Bashundhara Riverview Residency',
        type: 'RESIDENTIAL',
        status: 'PLANNING',
        landId: ctx.landAId,
        location: 'Block B, Riverview',
        district: 'Dhaka',
        upazila: 'Keraniganj',
        address: 'Road 5, Block B, Bashundhara Riverview, Hasnabad',
        startDate: '2025-01-01',
        expectedCompletionDate: '2028-12-31',
        estimatedBudgetPaisa: '50000000000', // 50 Crore BDT
        description: 'Luxury high-rise residential project',
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.code).toBe(createdProjectCode);
    expect(res.body.data.landId).toBe(ctx.landAId);
    expect(res.body.data.estimatedBudgetPaisa).toBe('50000000000');
    expect(res.body.data.costCenter).toBeDefined();
    expect(res.body.data.costCenter.code).toBe(`CC-${createdProjectCode}`);
    expect(res.body.data.costCenter.name).toContain('Bashundhara Riverview Residency');

    createdProjectId = res.body.data.id;
  });

  it('POST /api/v1/projects - denies access without project:create permission', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ctx.regularUserToken}`)
      .send({
        code: `PRJ-UNAUTH-${Date.now().toString().slice(-4)}`,
        name: 'Unauthorized Project',
        type: 'COMMERCIAL',
      })
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/v1/projects - rejects duplicate code within same company', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        code: createdProjectCode,
        name: 'Duplicate Code Project',
        type: 'RESIDENTIAL',
      })
      .expect(HttpStatus.CONFLICT);

    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('GET /api/v1/projects - lists projects with filters and pagination', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/projects?district=Dhaka&status=PLANNING`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].id).toBe(createdProjectId);
  });

  it('GET /api/v1/projects/:id - retrieves project details with linked land and cost center', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdProjectId);
    expect(res.body.data.costCenter).toBeDefined();
    expect(res.body.data.land).toBeDefined();
    expect(res.body.data.land.id).toBe(ctx.landAId);
    expect(res.body.data.land.areaSqft).toBe('14400.0000');
  });

  it('GET /api/v1/projects/:id/summary - returns project summary counts and linked master data', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/projects/${createdProjectId}/summary`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.project.id).toBe(createdProjectId);
    expect(res.body.data.project.code).toBe(createdProjectCode);
    expect(res.body.data.costCenter.code).toBe(`CC-${createdProjectCode}`);
    expect(res.body.data.linkedLand.id).toBe(ctx.landAId);
    expect(res.body.data.inventoryCounts).toEqual({
      totalUnits: 0,
      available: 0,
      booked: 0,
      sold: 0,
      hold: 0,
      blocked: 0,
    });
  });

  it('PATCH /api/v1/projects/:id - updates project details and status', async () => {
    const res = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        name: 'Bashundhara Riverview Residency Phase 1',
        status: 'UNDER_CONSTRUCTION',
      })
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Bashundhara Riverview Residency Phase 1');
    expect(res.body.data.status).toBe('UNDER_CONSTRUCTION');
  });

  it('GET /api/v1/projects/:id - cross-tenant isolation: Company B cannot read Company A project', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${ctx.mdBToken}`)
      .expect(HttpStatus.NOT_FOUND);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/v1/projects/:id - soft-deletes project and its linked cost center', async () => {
    await request(ctx.app.getHttpServer())
      .delete(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);

    // Subsequent retrieval returns 404
    await request(ctx.app.getHttpServer())
      .get(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.NOT_FOUND);
  });
});
