import { describe, expect, it } from 'vitest';
// @ts-expect-error - pure ESM script
import { findOpenApiBreakingChanges } from '../../../../scripts/check-openapi-breaking.mjs';

describe('OpenAPI Breaking Change Checker (ARCH-API-COMPAT / D-13 / A9.7)', () => {
  const baseSpec = {
    openapi: '3.0.0',
    info: { title: 'ExzaEstate API', version: '1.0.0' },
    paths: {
      '/api/v1/sales/bookings': {
        get: {
          operationId: 'getBookings',
          parameters: [{ name: 'page', in: 'query', required: false }],
          responses: {
            '200': {
              description: 'List bookings',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array' },
                      total: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: 'createBooking',
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/BookingResponseDto',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        BookingResponseDto: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            bookingNumber: { type: 'string' },
            status: { type: 'string' },
            totalAmountPaisa: { type: 'string' },
          },
        },
      },
    },
  };

  it('passes when API changes are strictly additive (new endpoints, new optional fields)', () => {
    const updatedSpec = JSON.parse(JSON.stringify(baseSpec));
    // Add new optional property to schema
    updatedSpec.components.schemas.BookingResponseDto.properties.notes = { type: 'string' };
    // Add new endpoint
    updatedSpec.paths['/api/v1/sales/bookings/{id}'] = {
      get: {
        operationId: 'getBookingById',
        responses: { '200': { description: 'Booking detail' } },
      },
    };

    const issues = findOpenApiBreakingChanges(baseSpec, updatedSpec);
    expect(issues).toHaveLength(0);
  });

  it('fails when a response field is removed from a schema (Acceptance requirement)', () => {
    const modifiedSpec = JSON.parse(JSON.stringify(baseSpec));
    // Remove totalAmountPaisa from BookingResponseDto
    delete modifiedSpec.components.schemas.BookingResponseDto.properties.totalAmountPaisa;

    const issues = findOpenApiBreakingChanges(baseSpec, modifiedSpec);
    expect(issues.length).toBeGreaterThan(0);
    const fieldRemoved = issues.find(
      (i: { type: string; location: string }) =>
        i.type === 'FIELD_REMOVED' && i.location.includes('totalAmountPaisa'),
    );
    expect(fieldRemoved).toBeDefined();
  });

  it('fails when an inline response property is removed', () => {
    const modifiedSpec = JSON.parse(JSON.stringify(baseSpec));
    delete modifiedSpec.paths['/api/v1/sales/bookings'].get.responses['200'].content[
      'application/json'
    ].schema.properties.total;

    const issues = findOpenApiBreakingChanges(baseSpec, modifiedSpec);
    expect(issues.length).toBeGreaterThan(0);
    const responseFieldRemoved = issues.find(
      (i: { type: string }) => i.type === 'RESPONSE_FIELD_REMOVED',
    );
    expect(responseFieldRemoved).toBeDefined();
  });

  it('fails when an existing path is removed', () => {
    const modifiedSpec = JSON.parse(JSON.stringify(baseSpec));
    delete modifiedSpec.paths['/api/v1/sales/bookings'];

    const issues = findOpenApiBreakingChanges(baseSpec, modifiedSpec);
    expect(issues.length).toBeGreaterThan(0);
    const pathRemoved = issues.find((i: { type: string }) => i.type === 'PATH_REMOVED');
    expect(pathRemoved).toBeDefined();
  });

  it('fails when an HTTP method operation is removed', () => {
    const modifiedSpec = JSON.parse(JSON.stringify(baseSpec));
    delete modifiedSpec.paths['/api/v1/sales/bookings'].post;

    const issues = findOpenApiBreakingChanges(baseSpec, modifiedSpec);
    expect(issues.length).toBeGreaterThan(0);
    const opRemoved = issues.find((i: { type: string }) => i.type === 'OPERATION_REMOVED');
    expect(opRemoved).toBeDefined();
  });

  it('fails when a new required parameter is introduced', () => {
    const modifiedSpec = JSON.parse(JSON.stringify(baseSpec));
    modifiedSpec.paths['/api/v1/sales/bookings'].get.parameters.push({
      name: 'mandatoryFilter',
      in: 'query',
      required: true,
    });

    const issues = findOpenApiBreakingChanges(baseSpec, modifiedSpec);
    expect(issues.length).toBeGreaterThan(0);
    const paramIssue = issues.find((i: { type: string }) => i.type === 'NEW_REQUIRED_PARAM');
    expect(paramIssue).toBeDefined();
  });
});
