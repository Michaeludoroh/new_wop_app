import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService login guards', () => {
  const passwordHash = bcrypt.hashSync('Password123!', 4);

  function createService(user: {
    id: string;
    email: string;
    fullName: string;
    passwordHash: string;
    role: Role;
    deletedAt: Date | null;
  }) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({ id: 'rt_1' }),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('token'),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        if (key === 'JWT_REFRESH_DAYS') return '7';
        if (key === 'AUTH_MAX_ACTIVE_SESSIONS') return '5';
        return undefined;
      }),
    };

    const service = new AuthService(
      prisma as never,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      { send: jest.fn() } as never,
      { welcomeEmail: jest.fn(), passwordResetEmail: jest.fn(), buildPasswordResetUrl: jest.fn() } as never,
    );

    return { service, prisma };
  }

  it('rejects login for disabled users', async () => {
    const { service } = createService({
      id: 'user_1',
      email: 'disabled@example.com',
      fullName: 'Disabled User',
      passwordHash,
      role: Role.USER,
      deletedAt: new Date(),
    });

    await expect(
      service.login({ email: 'disabled@example.com', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows login for active users', async () => {
    const { service } = createService({
      id: 'user_2',
      email: 'active@example.com',
      fullName: 'Active User',
      passwordHash,
      role: Role.USER,
      deletedAt: null,
    });

    const result = await service.login({ email: 'active@example.com', password: 'Password123!' });

    expect(result.user.email).toBe('active@example.com');
    expect(result.accessToken).toBe('token');
  });

  it('rejects refresh for disabled users', async () => {
    const prisma = {
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'session_1',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          user: {
            id: 'user_1',
            email: 'disabled@example.com',
            fullName: 'Disabled User',
            passwordHash,
            role: Role.USER,
            deletedAt: new Date(),
          },
        }),
        update: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('token'),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        if (key === 'JWT_REFRESH_DAYS') return '7';
        if (key === 'AUTH_MAX_ACTIVE_SESSIONS') return '5';
        return undefined;
      }),
    };

    const service = new AuthService(
      prisma as never,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      { send: jest.fn() } as never,
      { welcomeEmail: jest.fn(), passwordResetEmail: jest.fn(), buildPasswordResetUrl: jest.fn() } as never,
    );

    await expect(service.refresh({ refreshToken: 'refresh-token' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
