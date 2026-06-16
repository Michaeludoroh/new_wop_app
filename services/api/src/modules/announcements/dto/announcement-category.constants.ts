export const ANNOUNCEMENT_CATEGORIES = [
  'NEWS',
  'EVENT',
  'GENERAL_UPDATE',
  'PRAYER_MEETING',
  'CONFERENCE',
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];
