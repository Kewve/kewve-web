export type AppUserRole = 'buyer' | 'producer' | 'admin' | string | undefined;

export const normalizeRole = (role: AppUserRole) => String(role || 'producer').toLowerCase();

/** Normalize roles from API (`roles` array or legacy `role` string). */
export function normalizeUserRoles(user: { roles?: string[]; role?: string } | null | undefined): string[] {
  if (!user) return ['producer'];
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return Array.from(new Set(user.roles.map((r) => String(r).toLowerCase())));
  }
  return [normalizeRole(user.role)];
}

export const hasProducerAccess = (user: { roles?: string[]; role?: string } | null | undefined) =>
  normalizeUserRoles(user).includes('producer');

export const hasBuyerAccess = (user: { roles?: string[]; role?: string } | null | undefined) =>
  normalizeUserRoles(user).includes('buyer');

/** Default landing after login when no redirect is stored. */
export const getDefaultRouteForRole = (role: AppUserRole) => {
  const normalized = normalizeRole(role);
  if (normalized === 'buyer') return '/buyer';
  return '/dashboard/export-readiness';
};

export function getDefaultPostLoginRoute(user: { roles?: string[]; role?: string } | null | undefined) {
  if (hasProducerAccess(user)) return '/dashboard/export-readiness';
  if (hasBuyerAccess(user)) return '/buyer';
  return '/dashboard/export-readiness';
}
