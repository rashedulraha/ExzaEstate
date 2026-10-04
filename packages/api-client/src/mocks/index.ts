/**
 * Test-only MSW Mock Handlers.
 *
 * Rule: ARCH-SEED & architecture.md §12.2 / §23:
 * "Vitest may use the orval-generated MSW handlers in packages/api-client/src/mocks.
 * Non-test files must NEVER import from mocks/."
 */
export * from '../generated/api.msw.js';
