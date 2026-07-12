import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';

describe('EmailVerificationService', () => {
  const now = new Date('2026-07-07T12:00:00.000Z');

  function createService(overrides?: {
    user?: Record<string, unknown> | null;
    config?: Record<string, string>;
  }) {
    const user = overrides?.user ?? null;

    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        findFirst: jest.fn().mockImplementation(async (args: any) => {
          if (user && args?.where?.emailVerificationTokenHash) {
            return user.emailVerificationTokenHash ===
              args.where.emailVerificationTokenHash
              ? user
              : null;
          }
          if (user && args?.where?.id) {
            return user.id === args.where.id ? user : null;
          }
          return user;
        }),
        update: jest.fn().mockImplementation(async ({ data }: any) => ({
          ...(user ?? {}),
          ...data,
        })),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const configService = {
      get: jest.fn((key: string) => {
        const values = {
          REQUIRE_EMAIL_VERIFICATION: 'true',
          EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: '60',
          ...overrides?.config,
        };
        return values[key as keyof typeof values];
      }),
    };

    const emailService = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const emailTemplateService = {
      buildEmailVerificationUrl: jest.fn((token: string) => `https://app.test/verify-email?token=${token}`),
      emailVerificationEmail: jest.fn(() => ({
        subject: 'Verify your WOPP account',
        body: 'verify',
        html: '<p>verify</p>',
      })),
      welcomeEmail: jest.fn(() => ({
        subject: 'Welcome',
        body: 'welcome',
        html: '<p>welcome</p>',
      })),
    };

    const subscriptionsService = {
      initializeRegistrationTrial: jest.fn().mockResolvedValue(undefined),
    };

    const service = new EmailVerificationService(
      prisma,
      configService as never,
      emailService as never,
      emailTemplateService as never,
      subscriptionsService as never,
    );

    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    return {
      service,
      prisma,
      emailService,
      subscriptionsService,
    };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verifies a valid token and clears replay state', async () => {
    const rawToken = 'a'.repeat(64);
    const tokenHash = createService().service.hashToken(rawToken);
    const { service, prisma, subscriptionsService, emailService } = createService({
      user: {
        id: 'user_1',
        email: 'user@example.com',
        fullName: 'Jane Doe',
        emailVerified: false,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: new Date(now.getTime() + 60_000),
      },
    });

    await expect(service.verifyEmailToken(rawToken)).resolves.toEqual({
      message: 'Email verified successfully',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_1' },
        data: expect.objectContaining({
          emailVerified: true,
          emailVerificationTokenHash: null,
          emailVerificationExpiresAt: null,
        }),
      }),
    );
    expect(subscriptionsService.initializeRegistrationTrial).toHaveBeenCalledWith('user_1');
    expect(emailService.send).toHaveBeenCalled();
  });

  it('rejects expired tokens', async () => {
    const rawToken = 'b'.repeat(64);
    const tokenHash = createService().service.hashToken(rawToken);
    const { service } = createService({
      user: {
        id: 'user_1',
        emailVerified: false,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: new Date(now.getTime() - 1_000),
      },
    });

    await expect(service.verifyEmailToken(rawToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects invalid tokens', async () => {
    const { service } = createService({ user: null });
    await expect(service.verifyEmailToken('invalid-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('handles already verified tokens idempotently', async () => {
    const rawToken = 'c'.repeat(64);
    const tokenHash = createService().service.hashToken(rawToken);
    const { service } = createService({
      user: {
        id: 'user_1',
        emailVerified: true,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: new Date(now.getTime() + 60_000),
      },
    });

    await expect(service.verifyEmailToken(rawToken)).resolves.toEqual({
      message: 'Email already verified',
      alreadyVerified: true,
    });
  });

  it('prevents replay after successful verification clears token hash', async () => {
    const rawToken = 'd'.repeat(64);
    const tokenHash = createService().service.hashToken(rawToken);
    const { service, prisma } = createService({
      user: {
        id: 'user_1',
        email: 'user@example.com',
        fullName: 'Jane Doe',
        emailVerified: false,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: new Date(now.getTime() + 60_000),
      },
    });

    await service.verifyEmailToken(rawToken);

    prisma.user.findFirst.mockResolvedValueOnce(null);
    await expect(service.verifyEmailToken(rawToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('returns generic response for resend without revealing account state', async () => {
    const { service, emailService } = createService({ user: null });

    await expect(service.sendVerificationEmailForUserId('missing-user')).resolves.toEqual({
      message:
        'If your account requires verification, a verification link has been sent.',
    });
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('sends verification email for unverified users', async () => {
    const { service, emailService } = createService({
      user: {
        id: 'user_1',
        email: 'user@example.com',
        fullName: 'Jane Doe',
        emailVerified: false,
        updatedAt: new Date(now.getTime() - 120_000),
        emailVerificationExpiresAt: null,
      },
    });

    await service.sendVerificationEmailForUserId('user_1');
    expect(emailService.send).toHaveBeenCalled();
  });

  it('rate limits resend during cooldown', async () => {
    const { service, emailService } = createService({
      user: {
        id: 'user_1',
        email: 'user@example.com',
        fullName: 'Jane Doe',
        emailVerified: false,
        updatedAt: now,
        emailVerificationExpiresAt: new Date(now.getTime() + 60_000),
      },
    });

    await service.sendVerificationEmailForUserId('user_1');
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('audits admin manual verification', async () => {
    const { service, prisma } = createService({
      user: {
        id: 'user_1',
        email: 'user@example.com',
        fullName: 'Jane Doe',
        emailVerified: false,
      },
    });

    await service.adminVerifyEmail('user_1', 'admin_1');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'admin_1',
          action: 'EMAIL_VERIFIED_MANUAL',
          resource: 'USER',
          resourceId: 'user_1',
        }),
      }),
    );
  });

  it('throws when admin verifies missing user', async () => {
    const { service } = createService({ user: null });
    await expect(service.adminVerifyEmail('missing', 'admin_1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
