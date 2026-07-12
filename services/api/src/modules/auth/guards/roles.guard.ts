import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { hasRequiredRole, normalizeAppRole } from '../role.util';

type RequestUser = {
  sub: string;
  email: string;
  role: AppRole | string;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<Array<AppRole>>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const userRole = normalizeAppRole(request.user?.role);

    if (!userRole) {
      throw new ForbiddenException('Role information missing');
    }

    if (!hasRequiredRole(userRole, requiredRoles)) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }
}
