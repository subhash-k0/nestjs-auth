import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('Auth API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/resend-verification (POST) returns a generic response', () => {
    return request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ email: 'unknown@example.com' })
      .expect(200)
      .expect({
        message:
          'If an unverified account exists, a verification email has been sent.',
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
