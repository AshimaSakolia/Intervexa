import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

export function configureApp(app: INestApplication) {
  // Behind a reverse proxy every request otherwise appears to come from the
  // proxy's IP, so rate limiting would be shared by all users.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    (app as NestExpressApplication).set(
      'trust proxy',
      /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true',
    );
  }

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  // A trailing slash in FRONTEND_URL would never match the browser's Origin header.
  app.enableCors({ origin: process.env.FRONTEND_URL?.replace(/\/+$/, '') });
}
