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

    const body =
      typeof message === 'string' || Array.isArray(message)
        ? { statusCode: status, message }
        : { statusCode: status, ...message };

    response.status(status).json(body);
  }
}
