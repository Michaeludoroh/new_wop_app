export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface SubscriptionPlanDto {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  body: string;
  publishedAt?: string;
}

export interface ClipDto {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  publishedAt?: string;
}

export interface EbookDto {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  coverUrl?: string;
  publishedAt?: string;
}
