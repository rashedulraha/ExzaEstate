/**
 * Dependency injection tokens for clean-architecture ports.
 * Modules inject these symbols instead of concrete adapters.
 */
export const QUEUE_DRIVER = Symbol('QUEUE_DRIVER');
export const CACHE_STORE = Symbol('CACHE_STORE');
export const PUB_SUB = Symbol('PUB_SUB');
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
export const PDF_RENDERER = Symbol('PDF_RENDERER');
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
