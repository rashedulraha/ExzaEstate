import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Fallback safety net for JSON.stringify on raw BigInt
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function (): string {
    return this.toString();
  };
}

/**
 * Recursively converts any BigInt in an object to a string.
 */
export function serializeBigInt<T>(data: T): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'bigint') {
    return data.toString();
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeBigInt(item));
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeBigInt(value);
    }
    return result;
  }

  return data;
}

@Injectable()
export class BigIntSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serializeBigInt(data)));
  }
}
