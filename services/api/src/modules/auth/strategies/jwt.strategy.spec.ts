import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

function createStrategy(user: unknown) {
  const config = {
    get: jest.fn((key: string) => (key === 'JWT_ACCESS_SECRET' ? 'A'.repeat(48) : undefined)),
  } as unknown as ConfigService;

  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
    },
  } as unknown as PrismaService;

  return {
    strategy: new JwtStrategy(config, prisma),
    prisma,
  };
}

describe('JwtStrategy', () => {
  it('returns current active user role data', async () => {
    const { strategy } = createStrategy({
      id: 'user-1',
      email: 'user@example.com',
      role: Role.USER,
      deletedAt: null,
    });

    await expect(
      strategy.validate({ sub: 'user-1', email: 'user@example.com', role: 'USER' }),
    ).resolves.toEqual({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'USER',
    });
  });

  it('rejects tokens for deleted or missing users', async () => {
    const { strategy } = createStrategy({
      id: 'user-1',
      email: 'user@example.com',
      role: Role.USER,
      deletedAt: new Date(),
    });

    await expect(
      strategy.validate({ sub: 'user-1', email: 'user@example.com', role: 'USER' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects tokens whose role no longer matches the database', async () => {
    const { strategy } = createStrategy({
      id: 'user-1',
      email: 'user@example.com',
      role: Role.USER,
      deletedAt: null,
    });

    await expect(
      strategy.validate({ sub: 'user-1', email: 'user@example.com', role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
