import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

function createAuthService(overrides?: {
  user?: Record<string, unknown> | null;
  session?: Record<string, unknown> | null;
}) {
  const prisma: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue(overrides?.user ?? null),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn().mockResolvedValue(overrides?.session ?? null),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: any) => {
      if (typeof callback === 'function') {
        return callback(prisma);
      }
      return callback;
    }),
  };

  const jwtService = {
    signAsync: jest.fn(async () => 'token'),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      return undefined;
    }),
  };

  const subscriptionsService = {
    initializeRegistrationTrial: jest.fn().mockResolvedValue(null),
  };

  const emailVerificationService = {
    isVerificationRequired: jest.fn(() => false),
    issueAndSendVerificationEmail: jest.fn(),
    sendVerificationEmailForUserId: jest.fn(),
    verifyEmailToken: jest.fn(),
  };

  const service = new AuthService(
    prisma as never,
    jwtService as never,
    configService as never,
    { send: jest.fn() } as never,
    {
      welcomeEmail: jest.fn(),
      passwordResetEmail: jest.fn(),
      buildPasswordResetUrl: jest.fn(),
    } as never,
    subscriptionsService as never,
    emailVerificationService as never,
  );

  return { service, prisma };
}

describe('AuthService login disabled-user protection', () => {
  beforeEach(() => {
    bcryptMock.compare.mockResolvedValue(true as never);
  });

  it('rejects login for users with deletedAt set', async () => {
    const { service } = createAuthService({
      user: {
        id: 'user_1',
        email: 'disabled@example.com',
        fullName: 'Disabled User',
        passwordHash: 'hash',
        role: Role.USER,
        deletedAt: new Date(),
      },
    });

    await expect(
      service.login({ email: 'disabled@example.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows login for active users', async () => {
    const { service } = createAuthService({
      user: {
        id: 'user_1',
        email: 'active@example.com',
        fullName: 'Active User',
        passwordHash: 'hash',
        role: Role.USER,
        deletedAt: null,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    await expect(
      service.login({ email: 'active@example.com', password: 'Password123!' }),
    ).resolves.toMatchObject({
      user: expect.objectContaining({ email: 'active@example.com' }),
    });
  });

  it('rejects refresh for disabled users', async () => {
    const { service } = createAuthService({
      session: {
        id: 'session_1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: {
          id: 'user_1',
          email: 'disabled@example.com',
          fullName: 'Disabled User',
          role: Role.USER,
          deletedAt: new Date(),
        },
      },
    });

    await expect(service.refresh({ refreshToken: 'refresh-token' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
