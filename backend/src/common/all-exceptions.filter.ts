import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status: number = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? exception.getResponse()
      : 'Something went wrong. Please try again.';

    const isServerError = status >= 500;
    if (!isHttpException || isServerError) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    let body: { statusCode: number; message: string | string[] };
    if (typeof message === 'string' || Array.isArray(message)) {
      body = { statusCode: status, message };
    } else if (
      message &&
      typeof message === 'object' &&
      'message' in message &&
      (typeof message.message === 'string' || Array.isArray(message.message))
    ) {
      body = { statusCode: status, message: message.message };
    } else {
      body = {
        statusCode: status,
        message: 'Something went wrong. Please try again.',
      };
    }

    response.status(status).json(body);
  }
}
