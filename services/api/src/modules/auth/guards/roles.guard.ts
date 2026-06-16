import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

type RequestUser = {
  sub: string;
  email: string;
  role: AppRole;
};

const ROLE_HIERARCHY: Record<AppRole, number> = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

function hasRequiredRole(userRole: AppRole, requiredRoles: AppRole[]): boolean {
  const userLevel = ROLE_HIERARCHY[userRole];
  return requiredRoles.some((requiredRole) => userLevel >= ROLE_HIERARCHY[requiredRole]);
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<Array<RequestUser['role']>>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException('Role information missing');
    }

    if (!hasRequiredRole(user.role, requiredRoles)) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }
}
