import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { serializeBigInt } from '../serializers/bigint.serializer.js';

export interface ApiSuccessEnvelope<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

function isAlreadyEnvelope(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  return 'success' in data && (data as Record<string, unknown>).success === true && 'data' in data;
}

function isPaginatedResult(
  data: unknown,
): data is { data: unknown; meta?: Record<string, unknown> } {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  return 'data' in data && 'meta' in data && !('success' in data);
}

function wrapSuccessResponse(data: unknown): ApiSuccessEnvelope<unknown> {
  const serialized = serializeBigInt(data);

  if (isAlreadyEnvelope(serialized)) {
    return serialized as ApiSuccessEnvelope<unknown>;
  }

  if (isPaginatedResult(serialized)) {
    return {
      success: true,
      data: serialized.data,
      meta: serialized.meta,
    };
  }

  return {
    success: true,
    data: serialized ?? null,
  };
}

@Injectable()
export class ResponseEnvelopeInterceptor<T>
  implements NestInterceptor<T, ApiSuccessEnvelope<unknown>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessEnvelope<unknown>> {
    return next.handle().pipe(map(wrapSuccessResponse));
  }
}
