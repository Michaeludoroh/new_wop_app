import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions.service';

type AuthRequest = {
  user?: {
    sub: string;
    role: string;
  };
};

@Injectable()
export class PremiumAccessGuard implements CanActivate {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const userId = request.user?.sub;
    const role = request.user?.role;

    if (!userId) {
      throw new ForbiddenException({ message: 'Subscription required' });
    }

    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MODERATOR') {
      return true;
    }

    const requireVerification =
      this.configService.get<string>('REQUIRE_EMAIL_VERIFICATION') === 'true';
    if (requireVerification) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
      });

      if (!user?.emailVerified) {
        throw new ForbiddenException({
          message: 'Email verification required',
          code: 'EMAIL_NOT_VERIFIED',
        });
      }
    }

    const allowed = await this.subscriptionsService.userHasPremiumAccess(userId);
    if (!allowed) {
      throw new ForbiddenException({ message: 'Subscription required' });
    }

    return true;
  }
}
