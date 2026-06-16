import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

const sampleUser = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: 'User One',
  role: 'USER' as const,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function createService() {
  const prisma: any = {
    user: {
      findMany: jest.fn().mockResolvedValue([sampleUser]),
      findFirst: jest.fn().mockResolvedValue(sampleUser),
      update: jest.fn().mockResolvedValue(sampleUser),
      count: jest.fn().mockResolvedValue(1),
    },
    userSubscription: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  return {
    service: new UsersService(prisma),
    prisma,
  };
}

describe('UsersService ownership checks', () => {
  it('allows a user to read their own profile', async () => {
    const { service } = createService();

    const result = await service.findOne('user-1', { sub: 'user-1', role: 'USER' });
    expect(result.data.id).toBe('user-1');
    expect(result.data.active).toBe(true);
  });

  it('blocks a user from reading another profile', async () => {
    const { service } = createService();

    await expect(
      service.findOne('user-2', { sub: 'user-1', role: 'USER' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows admins to read any profile', async () => {
    const { service } = createService();

    const result = await service.findOne('user-2', { sub: 'admin-1', role: 'ADMIN' });
    expect(result.data.email).toBe('user@example.com');
  });

  it('throws not found for absent users', async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.findOne('missing', { sub: 'admin-1', role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('only updates allowed profile fields', async () => {
    const { service, prisma } = createService();

    await service.updateProfile(
      'user-1',
      { fullName: 'Updated User', role: 'ADMIN', email: 'other@example.com' },
      { sub: 'user-1', role: 'USER' },
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { fullName: 'Updated User' },
      }),
    );
  });

  it('filters users by search query for admin list', async () => {
    const { service, prisma } = createService();

    await service.findAll({ search: 'user@', limit: 20, offset: 0 });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      }),
    );
  });
});
