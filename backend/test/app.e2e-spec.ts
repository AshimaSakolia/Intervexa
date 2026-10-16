// Never run e2e tests against the database configured in .env.
process.env.DATABASE_URL =
  process.env.QA_DATABASE_URL ??
  'postgresql://interviewiq:interviewiq@localhost:3308/interviewiq_qa';
process.env.JWT_SECRET = 'qa-secret-qa-secret';
process.env.GEMINI_API_KEY = 'fake';
process.env.FRONTEND_URL = 'http://localhost:3009';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
