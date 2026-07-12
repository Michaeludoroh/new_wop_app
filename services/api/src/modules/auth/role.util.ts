import { Role } from '@prisma/client';
import { AppRole } from './auth.types';

const ROLE_HIERARCHY: Record<AppRole, number> = {
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

const PRISMA_ROLE_VALUES = new Set<string>(Object.values(Role));

export function normalizeAppRole(
  role: string | null | undefined,
): AppRole | null {
  if (!role) return null;

  const normalized = role.toUpperCase().replace(/[-\s]/g, '_');
  if (normalized === 'SUPERADMIN') return 'SUPER_ADMIN';

  if (PRISMA_ROLE_VALUES.has(normalized)) {
    return normalized as AppRole;
  }

  return null;
}

export function hasRequiredRole(
  userRole: AppRole,
  requiredRoles: AppRole[],
): boolean {
  const userLevel = ROLE_HIERARCHY[userRole];
  return requiredRoles.some(
    (requiredRole) => userLevel >= ROLE_HIERARCHY[requiredRole],
  );
}
