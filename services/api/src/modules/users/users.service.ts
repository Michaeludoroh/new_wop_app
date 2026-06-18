import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserQueryDto } from './dto/user-query.dto';

type RequestUser = {
  sub: string;
  role: Role;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdmin(user: RequestUser) {
    return user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
  }

  private selectSafeUser() {
    return {
      id: true,
      email: true,
      fullName: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    } as const;
  }

  private toUserResponse(
    user: {
      id: string;
      email: string;
      fullName: string;
      role: Role;
      lastLoginAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    },
    subscription?: {
      status: SubscriptionStatus;
      plan?: { code: string; name: string } | null;
    } | null,
  ) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      active: user.deletedAt === null,
      subscription: subscription
        ? {
            status: subscription.status,
            planCode: subscription.plan?.code ?? null,
            planName: subscription.plan?.name ?? null,
          }
        : null,
    };
  }

  async findAll(query: UserQueryDto = new UserQueryDto()) {
    const where: Prisma.UserWhereInput = {
      ...(query.status === 'ACTIVE' ? { deletedAt: null } : {}),
      ...(query.status === 'DISABLED' ? { deletedAt: { not: null } } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { fullName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset,
        take: query.limit,
        select: this.selectSafeUser(),
      }),
      this.prisma.user.count({ where }),
    ]);

    const subscriptions = await this.prisma.userSubscription.findMany({
      where: { userId: { in: users.map((user) => user.id) } },
      orderBy: { updatedAt: 'desc' },
      include: { plan: { select: { code: true, name: true } } },
    });

    const latestSubscriptionByUser = new Map<string, (typeof subscriptions)[number]>();
    for (const subscription of subscriptions) {
      if (!latestSubscriptionByUser.has(subscription.userId)) {
        latestSubscriptionByUser.set(subscription.userId, subscription);
      }
    }

    return {
      data: users.map((user) =>
        this.toUserResponse(user, latestSubscriptionByUser.get(user.id) ?? null),
      ),
      meta: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    };
  }

  async findOne(id: string, requester: RequestUser) {
    if (!this.isAdmin(requester) && requester.sub !== id) {
      throw new ForbiddenException('You can only access your own user profile');
    }

    const user = await this.prisma.user.findFirst({
      where: { id },
      select: this.selectSafeUser(),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.prisma.userSubscription.findFirst({
      where: { userId: id },
      orderBy: { updatedAt: 'desc' },
      include: { plan: { select: { code: true, name: true } } },
    });

    return {
      data: this.toUserResponse(user, subscription),
    };
  }

  async updateProfile(id: string, payload: Record<string, unknown>, requester: RequestUser) {
    if (!this.isAdmin(requester) && requester.sub !== id) {
      throw new ForbiddenException('You can only update your own user profile');
    }

    const fullName =
      typeof payload.fullName === 'string' && payload.fullName.trim().length > 0
        ? payload.fullName.trim()
        : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(fullName ? { fullName } : {}),
      },
      select: this.selectSafeUser(),
    });

    return {
      data: this.toUserResponse(user),
    };
  }

  async updateRole(id: string, role: Role, requester: RequestUser) {
    if (!this.isAdmin(requester)) {
      throw new ForbiddenException('Only administrators can update user roles');
    }

    if (role === Role.SUPER_ADMIN && requester.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super administrators can assign SUPER_ADMIN');
    }

    const existing = await this.prisma.user.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    if (existing.id === requester.sub && role !== existing.role) {
      throw new BadRequestException('You cannot change your own role');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: this.selectSafeUser(),
    });

    return { data: this.toUserResponse(user) };
  }

  async updateStatus(id: string, active: boolean, requester: RequestUser) {
    if (!this.isAdmin(requester)) {
      throw new ForbiddenException('Only administrators can update user status');
    }

    const existing = await this.prisma.user.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    if (existing.id === requester.sub && !active) {
      throw new BadRequestException('You cannot disable your own account');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: active ? null : new Date() },
      select: this.selectSafeUser(),
    });

    if (!active) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { data: this.toUserResponse(user) };
  }
}
