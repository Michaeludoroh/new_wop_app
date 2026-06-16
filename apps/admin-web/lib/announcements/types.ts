export type AnnouncementCategory =
  | "NEWS"
  | "EVENT"
  | "GENERAL_UPDATE"
  | "PRAYER_MEETING"
  | "CONFERENCE";

export type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type AnnouncementCategoryOption = {
  value: AnnouncementCategory;
  label: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  imageUrl?: string | null;
  status: AnnouncementStatus;
  isPublished: boolean;
  pushNotificationSent?: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  publishedBy?: {
    id: string;
    name?: string;
    email?: string;
  };
};

export type AnnouncementPayload = {
  title: string;
  content: string;
  category?: AnnouncementCategory;
  imageUrl?: string | null;
  isPublished?: boolean;
};

export type AnnouncementFeedQuery = {
  status?: AnnouncementStatus | "ALL";
  category?: AnnouncementCategory | "";
  search?: string;
  page?: number;
  limit?: number;
};

export type AnnouncementFeedResponse = {
  items: Announcement[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AnnouncementUploadResponse = {
  url: string;
  key: string;
};
