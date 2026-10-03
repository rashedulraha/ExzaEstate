import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProjectTestContext, setupProjectTest } from './project-test.helper.js';

describe('Cost Center Management (Task A1.4 - S2)', () => {
  let ctx: ProjectTestContext;
  let createdProjectId: string;
  let createdCostCenterId: string;
  let costCenterCode: string;

  beforeAll(async () => {
    ctx = await setupProjectTest();
    costCenterCode = `CC-TEST-${Date.now().toString().slice(-4)}`;

    // Create a project which automatically provisions a cost center
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        code: `PRJ-CC-${Date.now().toString().slice(-4)}`,
        name: 'Gulshan Corporate Avenue',
        type: 'COMMERCIAL',
        costCenterCode,
        costCenterName: 'Gulshan Corporate Cost Center',
      })
      .expect(HttpStatus.CREATED);

    createdProjectId = res.body.data.id;
    createdCostCenterId = res.body.data.costCenter.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('GET /api/v1/cost-centers - lists all active cost centers for the company', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/v1/cost-centers')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((cc: { id: string }) => cc.id === createdCostCenterId);
    expect(found).toBeDefined();
    expect(found.code).toBe(costCenterCode);
    expect(found.project.id).toBe(createdProjectId);
  });

  it('GET /api/v1/cost-centers/:id - retrieves cost center details by ID', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/cost-centers/${createdCostCenterId}`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdCostCenterId);
    expect(res.body.data.code).toBe(costCenterCode);
    expect(res.body.data.project).toBeDefined();
    expect(res.body.data.project.id).toBe(createdProjectId);
  });

  it('PATCH /api/v1/cost-centers/:id - denies update without project:edit permission', async () => {
    const res = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/cost-centers/${createdCostCenterId}`)
      .set('Authorization', `Bearer ${ctx.regularUserToken}`)
      .send({
        name: 'Unauthorized Edit',
      })
      .expect(HttpStatus.FORBIDDEN);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('PATCH /api/v1/cost-centers/:id - updates cost center details', async () => {
    const res = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/cost-centers/${createdCostCenterId}`)
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        name: 'Gulshan Corporate Avenue Cost Center Updated',
        description: 'Updated operational cost center for Gulshan project',
        isActive: true,
      })
      .expect(HttpStatus.OK);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Gulshan Corporate Avenue Cost Center Updated');
    expect(res.body.data.description).toBe('Updated operational cost center for Gulshan project');
  });

  it('GET /api/v1/cost-centers/:id - cross-tenant isolation: Company B cannot read Company A cost center', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/v1/cost-centers/${createdCostCenterId}`)
      .set('Authorization', `Bearer ${ctx.mdBToken}`)
      .expect(HttpStatus.NOT_FOUND);

    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects duplicate cost-center code when creating another project in same company', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ctx.mdAToken}`)
      .send({
        code: `PRJ-DUP-CC-${Date.now().toString().slice(-4)}`,
        name: 'Duplicate CC Project',
        type: 'COMMERCIAL',
        costCenterCode, // same cost center code as already used
      })
      .expect(HttpStatus.CONFLICT);

    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toContain('already exists');
  });
});
