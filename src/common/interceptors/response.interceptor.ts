import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { randomUUID } from 'crypto';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] ?? randomUUID();
    return next.handle().pipe(
      map((value) => {
        if (value && typeof value === 'object' && (value as any).__raw === true) {
          return (value as any).payload;
        }
        if (
          value &&
          typeof value === 'object' &&
          'items' in (value as any) &&
          'pagination' in (value as any)
        ) {
          return {
            data: (value as any).items,
            pagination: (value as any).pagination,
            meta: { requestId, timestamp: new Date().toISOString() },
          };
        }
        return { data: value, meta: { requestId, timestamp: new Date().toISOString() } };
      }),
    );
  }
}
