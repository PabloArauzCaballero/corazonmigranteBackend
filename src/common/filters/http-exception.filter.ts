import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const requestId = request.headers['x-request-id'] ?? randomUUID();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const defaultCode = status === 500 ? 'INTERNAL_SERVER_ERROR' : `HTTP_${status}`;
    let code = defaultCode;
    let message = 'Ocurrió un error inesperado.';
    let details: unknown[] = [];

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object') {
      const obj = exceptionResponse as Record<string, any>;
      code = obj.code ?? defaultCode;
      message = obj.message ?? message;
      details = Array.isArray(obj.details)
        ? obj.details
        : Array.isArray(obj.message)
          ? obj.message
          : [];
    }

    response.status(status).json({
      error: { code, message, details },
      meta: { requestId, timestamp: new Date().toISOString() },
    });
  }
}
