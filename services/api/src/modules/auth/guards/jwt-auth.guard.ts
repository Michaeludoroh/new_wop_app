import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    if (user) {
      return user;
    }

    if (process.env.NODE_ENV !== 'production') {
      const request = context.switchToHttp().getRequest<{ method?: string; url?: string }>();
      console.warn('[jwt-auth.guard] unauthorized', {
        method: request?.method,
        url: request?.url,
        info: info instanceof Error ? info.message : info,
        err: err instanceof Error ? err.message : err,
        status,
      });
    }

    if (err instanceof UnauthorizedException) {
      throw err;
    }

    if (info instanceof Error) {
      throw new UnauthorizedException(info.message);
    }

    if (typeof info === 'string' && info.trim()) {
      throw new UnauthorizedException(info);
    }

    throw new UnauthorizedException();
  }
}
