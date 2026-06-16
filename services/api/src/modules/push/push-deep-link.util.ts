export const PushEntityType = {
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  EVENT: 'EVENT',
  PROGRAM: 'PROGRAM',
  MENTORSHIP: 'MENTORSHIP',
  LIBRARY: 'LIBRARY',
} as const;

export type PushEntityTypeValue = (typeof PushEntityType)[keyof typeof PushEntityType];

export type PushDeepLinkInput = {
  entityType?: PushEntityTypeValue | string;
  entityId?: string;
  route?: string;
};

export function resolvePushRoute(entityType: string, entityId?: string) {
  switch (entityType.toUpperCase()) {
    case PushEntityType.ANNOUNCEMENT:
      return entityId ? '/announcements/details' : '/announcements';
    case PushEntityType.EVENT:
      return entityId ? '/events/details' : '/events';
    case PushEntityType.PROGRAM:
      return entityId ? '/programs/details' : '/programs';
    case PushEntityType.MENTORSHIP:
      return entityId ? '/mentorship/details' : '/mentorship';
    case PushEntityType.LIBRARY:
      return '/library';
    default:
      return undefined;
  }
}

export function buildPushData(
  base: Record<string, string>,
  deepLink?: PushDeepLinkInput,
): Record<string, string> {
  const data: Record<string, string> = { ...base };

  if (deepLink?.entityType) {
    data.entityType = deepLink.entityType.toUpperCase();
  }
  if (deepLink?.entityId) {
    data.entityId = deepLink.entityId;
  }

  const route = deepLink?.route ?? (deepLink?.entityType ? resolvePushRoute(deepLink.entityType, deepLink.entityId) : undefined);
  if (route) {
    data.route = route;
  }

  return data;
}
