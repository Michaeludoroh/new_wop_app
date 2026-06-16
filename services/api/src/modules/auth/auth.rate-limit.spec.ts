import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
const request = require('supertest');
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('Auth rate limiting', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60_000, limit: 100 }],
        }),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(async () => ({ ok: true })),
            login: jest.fn(async () => {
              throw new Error('invalid credentials');
            }),
            logout: jest.fn(async () => ({ message: 'ok' })),
            refresh: jest.fn(async () => ({ ok: true })),
            forgotPassword: jest.fn(async () => {
              throw new Error('noop');
            }),
            resetPassword: jest.fn(async () => ({ message: 'ok' })),
            me: jest.fn(async () => ({ id: '1' })),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 after exceeding login endpoint throttle', async () => {
    const payload = { email: 'user@example.com' };

    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer()).post('/auth/login').send(payload).expect(400);
    }

    await request(app.getHttpServer()).post('/auth/login').send(payload).expect(429);
  });

  it('returns 429 after exceeding forgot-password endpoint throttle', async () => {
    const payload = { email: 'user@example.com' };

    for (let i = 0; i < 3; i += 1) {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(payload)
        .expect(500);
    }

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send(payload)
      .expect(429);
  });
});
