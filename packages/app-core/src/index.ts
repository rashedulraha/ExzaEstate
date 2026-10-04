/**
 * @exzaestate/app-core
 * Master application runtime: session, auth, permissions, platform adapters, runtime config, and error handling.
 */

export const APP_CORE_VERSION = '0.1.0';

export * from './platform/index.js';
export * from './session/index.js';
export * from './permissions/index.js';
export * from './errors/index.js';
export * from './runtime/index.js';
