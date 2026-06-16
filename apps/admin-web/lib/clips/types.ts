export type ClipStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type Clip = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  category: string;
  durationSeconds: number | null;
  speaker: string | null;
  scriptureReferences: string[];
  tags: string[];
  viewCount: number;
  featured: boolean;
  status: ClipStatus;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClipListQuery = {
  search?: string;
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
};

export type ClipListResponse = {
  data: Clip[];
  total: number;
  limit: number;
  offset: number;
};

export type ClipPayload = {
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category?: string;
  durationSeconds?: number;
  speaker?: string;
  scriptureReferences?: string[];
  tags?: string[];
  featured?: boolean;
  isPublished?: boolean;
};
