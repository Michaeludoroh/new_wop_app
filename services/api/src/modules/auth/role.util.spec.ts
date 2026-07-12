import { Role } from '@prisma/client';
import { hasRequiredRole, normalizeAppRole } from './role.util';

describe('role.util', () => {
  it('normalizes SUPERADMIN aliases to SUPER_ADMIN', () => {
    expect(normalizeAppRole('SUPERADMIN')).toBe('SUPER_ADMIN');
    expect(normalizeAppRole('super-admin')).toBe('SUPER_ADMIN');
  });

  it('accepts canonical Prisma role values', () => {
    expect(normalizeAppRole(Role.SUPER_ADMIN)).toBe('SUPER_ADMIN');
    expect(normalizeAppRole('ADMIN')).toBe('ADMIN');
  });

  it('grants SUPER_ADMIN access to ADMIN-only routes', () => {
    expect(hasRequiredRole('SUPER_ADMIN', ['ADMIN'])).toBe(true);
    expect(hasRequiredRole('SUPER_ADMIN', ['USER'])).toBe(true);
  });

  it('rejects invalid roles', () => {
    expect(normalizeAppRole('NOT_A_ROLE')).toBeNull();
    expect(normalizeAppRole('')).toBeNull();
  });
});
