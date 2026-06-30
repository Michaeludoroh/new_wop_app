import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';

type AuthRequest = {
  user?: {
    sub: string;
    role: string;
  };
};

@Injectable()
export class PremiumAccessGuard implements CanActivate {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

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

    const allowed = await this.subscriptionsService.userHasPremiumAccess(userId);
    if (!allowed) {
      throw new ForbiddenException({ message: 'Subscription required' });
    }

    return true;
  }
}
