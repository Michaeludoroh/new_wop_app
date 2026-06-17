import { INestApplication, ValidationPipe, Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
const request = require('supertest');
import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';
import { PaymentsController } from '../modules/payments/payments.controller';
import { PaymentsService } from '../modules/payments/payments.service';
import { EventsController } from '../modules/events/events.controller';
import { EventsService } from '../modules/events/events.service';
import { ProgramsController } from '../modules/programs/programs.controller';
import { ProgramsService } from '../modules/programs/programs.service';
import { MentorshipController } from '../modules/mentorship/mentorship.controller';
import { MentorshipService } from '../modules/mentorship/mentorship.service';
import { PoliciesController } from '../modules/policies/policies.controller';
import { PoliciesService } from '../modules/policies/policies.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';

@Injectable()
class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = { sub: 'user-smoke-1', role: 'USER', email: 'smoke@example.com' };
    return true;
  }
}

async function createApp(
  controller: Type<unknown>,
  providerToken: Type<unknown>,
  providerValue: unknown,
) {
  const moduleRef = await Test.createTestingModule({
    controllers: [controller],
    providers: [
      { provide: providerToken, useValue: providerValue },
      { provide: APP_GUARD, useClass: TestAuthGuard },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useClass(TestAuthGuard)
    .overrideGuard(RolesGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();
  return app;
}

describe('Beta launch smoke integration', () => {
  describe('Authentication', () => {
    let app: INestApplication;
    const authService = {
      register: jest.fn(async () => ({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-smoke-1', email: 'smoke@example.com', role: 'USER' },
      })),
      login: jest.fn(async () => ({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-smoke-1', email: 'smoke@example.com', role: 'USER' },
      })),
    };

    beforeAll(async () => {
      app = await createApp(AuthController, AuthService, authService);
    });

    afterAll(async () => {
      await app.close();
    });

    it('registers a user via POST /auth/register', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'smoke@example.com',
          password: 'Password123!',
          fullName: 'Smoke User',
        })
        .expect(201);

      expect(response.body.accessToken).toBe('access-token');
      expect(authService.register).toHaveBeenCalled();
    });

    it('logs in via POST /auth/login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'smoke@example.com',
          password: 'Password123!',
        })
        .expect(201);

      expect(response.body.user.email).toBe('smoke@example.com');
      expect(authService.login).toHaveBeenCalled();
    });
  });

  describe('Subscription purchase checkout', () => {
    let app: INestApplication;
    const paymentsService = {
      initiateSubscriptionCheckout: jest.fn(async () => ({
        checkoutUrl: 'https://checkout.flutterwave.com/v3/hosted/pay/sub',
        providerReference: 'wop_sub_smoke_1',
      })),
    };

    beforeAll(async () => {
      app = await createApp(PaymentsController, PaymentsService, paymentsService);
    });

    afterAll(async () => {
      await app.close();
    });

    it('initiates subscription checkout', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout/subscription')
        .send({ planCode: 'PREMIUM' })
        .expect(201);

      expect(response.body.checkoutUrl).toContain('flutterwave');
      expect(response.body.providerReference).toBe('wop_sub_smoke_1');
    });
  });

  describe('eBook purchase checkout', () => {
    let app: INestApplication;
    const paymentsService = {
      initiateEbookCheckout: jest.fn(async () => ({
        checkoutUrl: 'https://checkout.flutterwave.com/v3/hosted/pay/ebook',
        providerReference: 'wop_ebook_smoke_1',
      })),
    };

    beforeAll(async () => {
      app = await createApp(PaymentsController, PaymentsService, paymentsService);
    });

    afterAll(async () => {
      await app.close();
    });

    it('initiates eBook checkout', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout/ebook')
        .send({ ebookId: 'ebook-smoke-1' })
        .expect(201);

      expect(response.body.providerReference).toBe('wop_ebook_smoke_1');
    });
  });

  describe('Flutterwave webhook processing', () => {
    let app: INestApplication;
    const paymentsService = {
      createWebhookDto: jest.fn((_provider, signature, payload) => ({
        provider: PaymentProvider.FLUTTERWAVE,
        eventId: 'evt_smoke_1',
        eventType: 'charge.completed',
        signature,
        providerReference: 'wop_sub_smoke_1',
        payload,
      })),
      processWebhook: jest.fn(async () => ({
        processed: true,
        status: 'SUCCESS',
        subscriptionActivated: true,
      })),
    };

    beforeAll(async () => {
      app = await createApp(PaymentsController, PaymentsService, paymentsService);
    });

    afterAll(async () => {
      await app.close();
    });

    it('accepts Flutterwave webhook at POST /payments/webhooks/flutterwave', async () => {
      const payload = {
        event: 'charge.completed',
        data: { id: 1, tx_ref: 'wop_sub_smoke_1', status: 'successful', amount: 25 },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/webhooks/flutterwave')
        .set('verif-hash', 'staging-webhook-secret')
        .send(payload)
        .expect(201);

      expect(response.body.processed).toBe(true);
      expect(paymentsService.processWebhook).toHaveBeenCalled();
    });
  });

  describe('Event RSVP', () => {
    let app: INestApplication;
    const eventsService = {
      rsvp: jest.fn(async () => ({ success: true, status: 'CONFIRMED' })),
    };

    beforeAll(async () => {
      app = await createApp(EventsController, EventsService, eventsService);
    });

    afterAll(async () => {
      await app.close();
    });

    it('creates RSVP via POST /events/:id/rsvp', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/events/event-smoke-1/rsvp')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(eventsService.rsvp).toHaveBeenCalledWith('event-smoke-1', 'user-smoke-1');
    });
  });

  describe('Program enrollment', () => {
    let app: INestApplication;
    const programsService = {
      enroll: jest.fn(async () => ({ success: true, enrollmentId: 'enroll-smoke-1' })),
    };

    beforeAll(async () => {
      app = await createApp(ProgramsController, ProgramsService, programsService);
    });

    afterAll(async () => {
      await app.close();
    });

    it('enrolls via POST /programs/:id/enroll', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/programs/program-smoke-1/enroll')
        .expect(201);

      expect(response.body.enrollmentId).toBe('enroll-smoke-1');
      expect(programsService.enroll).toHaveBeenCalledWith('program-smoke-1', 'user-smoke-1');
    });
  });

  describe('Mentorship enrollment', () => {
    let app: INestApplication;
    const mentorshipService = {
      enroll: jest.fn(async () => ({ success: true, enrollmentId: 'mentor-smoke-1' })),
    };

    beforeAll(async () => {
      app = await createApp(MentorshipController, MentorshipService, mentorshipService);
    });

    afterAll(async () => {
      await app.close();
    });

    it('enrolls via POST /mentorship/:id/enroll', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/mentorship/class-smoke-1/enroll')
        .expect(201);

      expect(response.body.enrollmentId).toBe('mentor-smoke-1');
      expect(mentorshipService.enroll).toHaveBeenCalledWith('class-smoke-1', 'user-smoke-1');
    });
  });

  describe('Policy acceptance', () => {
    let app: INestApplication;
    const policiesService = {
      acceptPolicy: jest.fn(async () => ({
        success: true,
        acceptance: { policyId: 'policy-smoke-1', version: 1 },
      })),
    };

    beforeAll(async () => {
      app = await createApp(PoliciesController, PoliciesService, policiesService);
    });

    afterAll(async () => {
      await app.close();
    });

    it('accepts policy via POST /policies/me/accept', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/policies/me/accept')
        .send({ policyId: 'policy-smoke-1' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(policiesService.acceptPolicy).toHaveBeenCalledWith(
        'user-smoke-1',
        expect.objectContaining({ policyId: 'policy-smoke-1' }),
      );
    });
  });
});
