import { describe, expect, it } from 'vitest';
// @ts-expect-error mjs script has no type declarations
import { checkControllerContent } from '../../../../scripts/check-permission-decorators.mjs';

describe('S2: Permissions Scope & Decorator Coverage Suite', () => {
  it('detects missing permission decorators on undecorated controller routes', () => {
    const sampleUndecorated = `
      @Controller('sample')
      export class SampleController {
        @Get('open')
        openRoute() { return {}; }
      }
    `;
    const result = checkControllerContent('sample.controller.ts', sampleUndecorated);
    expect(result.violations.length).toBe(1);
    expect(result.violations[0]?.methodName).toBe('openRoute');
  });

  it('passes on controller routes with @RequirePermission', () => {
    const sampleGuarded = `
      @Controller('sample')
      export class SampleController {
        @RequirePermission(PERMISSIONS.PROPERTY_VIEW)
        @Get('view')
        viewRoute() { return {}; }
      }
    `;
    const result = checkControllerContent('sample.controller.ts', sampleGuarded);
    expect(result.violations.length).toBe(0);
  });

  it('passes on controller routes with @Public', () => {
    const samplePublic = `
      @Controller('sample')
      export class SampleController {
        @Public()
        @Get('public')
        publicRoute() { return {}; }
      }
    `;
    const result = checkControllerContent('sample.controller.ts', samplePublic);
    expect(result.violations.length).toBe(0);
  });
});
