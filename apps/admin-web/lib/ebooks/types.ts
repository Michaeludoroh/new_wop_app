export type EbookStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type EbookItem = {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  price: number;
  isPremium: boolean;
  fileUrl: string;
  coverUrl?: string | null;
  status: EbookStatus;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EbookPayload = {
  title: string;
  author?: string;
  description?: string;
  category?: string;
  price?: number;
  isPremium?: boolean;
  fileUrl: string;
  coverUrl?: string;
  isPublished?: boolean;
};

export type EbookListQuery = {
  search?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export type EbookListResponse = {
  data: EbookItem[];
  total: number;
  limit: number;
  offset: number;
};

export type EbookAnalytics = {
  totals: {
    ebooks: number;
    published: number;
    draft: number;
    archived: number;
    purchases: number;
    revenue: number | string;
    progressRecords: number;
    activeReadersLast7Days: number;
    completedReads: number;
    downloads: number;
  };
  topPurchased: Array<{ ebookId: string; title: string; count: number }>;
  topReading: Array<{ ebookId: string; title: string; count: number }>;
};

export type UploadResult = {
  url: string;
  key: string;
};
