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

  const emailService = {
    send: jest.fn().mockResolvedValue({
      provider: 'mock',
      attempts: [{ to: 'user@example.com', success: true, retryable: false }],
    }),
  };

  const service = new AuthService(
    prisma as never,
    jwtService as never,
    configService as never,
    emailService as never,
    {
      welcomeEmail: jest.fn(),
      passwordResetEmail: jest.fn((fullName: string, resetUrl: string) => ({
        subject: 'reset',
        body: `Hello ${fullName}\n${resetUrl}`,
        html: `<p><a href="${resetUrl}">Reset</a></p>`,
      })),
      passwordResetSuccessEmail: jest.fn().mockReturnValue({
        subject: 'updated',
        body: 'body',
        html: '<p>body</p>',
      }),
      buildPasswordResetUrl: jest.fn(
        (token: string) => `https://woppandmopp.com/reset-password?token=${token}`,
      ),
    } as never,
    subscriptionsService as never,
    emailVerificationService as never,
  );

  return { service, prisma, emailService };
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

describe('AuthService password reset', () => {
  it('does not reveal whether an unknown email exists and does not send mail', async () => {
    const { service, prisma, emailService } = createAuthService({ user: null });

    await expect(service.forgotPassword({ email: 'missing@example.com' })).resolves.toEqual({
      message: 'If the email exists, a reset link has been generated',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('stores a hashed reset token with expiry and sends email for a known user', async () => {
    const { service, prisma, emailService } = createAuthService({
      user: {
        id: 'user_1',
        email: 'active@example.com',
        fullName: 'Active User',
        passwordHash: 'hash',
        role: Role.USER,
        deletedAt: null,
      },
    });

    const result = await service.forgotPassword({ email: 'active@example.com' });

    expect(result.message).toBe('If the email exists, a reset link has been generated');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_1' },
        data: expect.objectContaining({
          passwordResetTokenHash: expect.any(String),
          passwordResetExpiresAt: expect.any(Date),
        }),
      }),
    );
    const storedHash = prisma.user.update.mock.calls[0][0].data.passwordResetTokenHash as string;
    expect(storedHash).toHaveLength(64);
    expect(storedHash).not.toMatch(/[^a-f0-9]/);
    expect(emailService.send).toHaveBeenCalledTimes(1);
    const sent = emailService.send.mock.calls[0][0][0];
    expect(sent.to).toBe('active@example.com');
    expect(sent.html).not.toContain(storedHash);
    expect(sent.html).toContain('https://woppandmopp.com/reset-password?token=');
    expect(sent.html).not.toContain('admin.woppandmopp.com');
    expect(sent.body).not.toContain('admin.woppandmopp.com');
  });

  it('does not return resetToken from forgotPassword when NODE_ENV is production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const { service, prisma, emailService } = createAuthService({
        user: {
          id: 'user_1',
          email: 'active@example.com',
          fullName: 'Active User',
          passwordHash: 'hash',
          role: Role.USER,
          deletedAt: null,
        },
      });

      const result = await service.forgotPassword({ email: 'active@example.com' });

      expect(result).toEqual({
        message: 'If the email exists, a reset link has been generated',
      });
      expect(result).not.toHaveProperty('resetToken');
      expect(result).not.toHaveProperty('expiresAt');
      expect(JSON.stringify(result)).not.toMatch(/resetToken/i);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordResetTokenHash: expect.any(String),
            passwordResetExpiresAt: expect.any(Date),
          }),
        }),
      );
      const storedHash = prisma.user.update.mock.calls[0][0].data
        .passwordResetTokenHash as string;
      expect(storedHash).toHaveLength(64);
      expect(JSON.stringify(result)).not.toContain(storedHash);
      expect(emailService.send).toHaveBeenCalledTimes(1);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('returns resetToken from forgotPassword outside production for local testing', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    try {
      const { service } = createAuthService({
        user: {
          id: 'user_1',
          email: 'active@example.com',
          fullName: 'Active User',
          passwordHash: 'hash',
          role: Role.USER,
          deletedAt: null,
        },
      });

      const result = await service.forgotPassword({ email: 'active@example.com' });

      expect(result.message).toBe('If the email exists, a reset link has been generated');
      expect(result).toHaveProperty('resetToken');
      expect(typeof (result as { resetToken?: unknown }).resetToken).toBe('string');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('updates the password hash and clears the reset token', async () => {
    bcryptMock.hash.mockResolvedValue('new-hash' as never);
    const { service, prisma } = createAuthService();
    prisma.user.findFirst.mockResolvedValue({
      id: 'user_1',
      email: 'active@example.com',
      fullName: 'Active User',
    });

    await expect(
      service.resetPassword({ token: 'a'.repeat(32), newPassword: 'NewPass123' }),
    ).resolves.toEqual({ message: 'Password reset successful' });

    expect(bcryptMock.hash).toHaveBeenCalledWith('NewPass123', 12);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_1' },
        data: expect.objectContaining({
          passwordHash: 'new-hash',
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        }),
      }),
    );
  });

  it('rejects invalid or expired reset tokens', async () => {
    const { service, prisma } = createAuthService();
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.resetPassword({ token: 'a'.repeat(32), newPassword: 'NewPass123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a reset token after it has already been used', async () => {
    bcryptMock.hash.mockResolvedValue('new-hash' as never);
    const { service, prisma } = createAuthService();
    prisma.user.findFirst
      .mockResolvedValueOnce({
        id: 'user_1',
        email: 'active@example.com',
        fullName: 'Active User',
        role: Role.USER,
      })
      .mockResolvedValueOnce(null);

    await service.resetPassword({ token: 'a'.repeat(32), newPassword: 'NewPass123' });
    await expect(
      service.resetPassword({ token: 'a'.repeat(32), newPassword: 'NewPass123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows a normal user to log in after a successful password reset', async () => {
    bcryptMock.hash.mockResolvedValue('new-hash' as never);
    bcryptMock.compare.mockResolvedValue(true as never);
    const { service, prisma } = createAuthService();
    prisma.user.findFirst.mockResolvedValue({
      id: 'user_1',
      email: 'active@example.com',
      fullName: 'Active User',
      role: Role.USER,
    });

    await service.resetPassword({ token: 'a'.repeat(32), newPassword: 'NewPass123' });

    prisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'active@example.com',
      fullName: 'Active User',
      passwordHash: 'new-hash',
      role: Role.USER,
      deletedAt: null,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    await expect(
      service.login({ email: 'active@example.com', password: 'NewPass123' }),
    ).resolves.toMatchObject({
      user: expect.objectContaining({ email: 'active@example.com', role: 'USER' }),
    });
  });
});
