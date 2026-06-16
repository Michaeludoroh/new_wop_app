import { createAuthenticatedClient } from "../auth/http-client";
import {
  Announcement,
  AnnouncementCategoryOption,
  AnnouncementFeedQuery,
  AnnouncementFeedResponse,
  AnnouncementPayload,
  AnnouncementUploadResponse
} from "./types";

const announcementsClient = createAuthenticatedClient();

function normalizeAnnouncement(raw: unknown): Announcement {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id ?? ""),
    title: String(item.title ?? ""),
    content: String(item.content ?? ""),
    category: (item.category as Announcement["category"]) ?? "GENERAL_UPDATE",
    imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
    status: (item.status as Announcement["status"]) ?? "DRAFT",
    isPublished: Boolean(item.isPublished),
    pushNotificationSent: Boolean(item.pushNotificationSent),
    publishedAt: item.publishedAt ? String(item.publishedAt) : null,
    createdAt: String(item.createdAt ?? ""),
    updatedAt: String(item.updatedAt ?? ""),
    publishedBy: item.publishedBy as Announcement["publishedBy"]
  };
}

function normalizeFeedResponse(data: unknown, query?: AnnouncementFeedQuery): AnnouncementFeedResponse {
  if (Array.isArray(data)) {
    return {
      items: data.map(normalizeAnnouncement),
      meta: {
        page: query?.page ?? 1,
        limit: query?.limit ?? data.length,
        total: data.length,
        totalPages: 1
      }
    };
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const items = Array.isArray(record.data)
      ? record.data.map(normalizeAnnouncement)
      : Array.isArray(record.items)
        ? record.items.map(normalizeAnnouncement)
        : [];
    const meta = (record.meta as AnnouncementFeedResponse["meta"] | undefined) ?? {
      page: query?.page ?? 1,
      limit: query?.limit ?? items.length,
      total: items.length,
      totalPages: 1
    };
    return { items, meta };
  }

  return {
    items: [],
    meta: { page: 1, limit: query?.limit ?? 20, total: 0, totalPages: 0 }
  };
}

export const announcementsApi = {
  async getCategories(): Promise<AnnouncementCategoryOption[]> {
    const response = await announcementsClient.get<{ data: AnnouncementCategoryOption[] }>(
      "/announcements/admin/categories"
    );
    return response.data.data ?? [];
  },

  async getFeed(query?: AnnouncementFeedQuery): Promise<AnnouncementFeedResponse> {
    const response = await announcementsClient.get<unknown>("/announcements/admin", {
      params: {
        ...query,
        status: query?.status && query.status !== "ALL" ? query.status : undefined,
        category: query?.category || undefined
      }
    });
    return normalizeFeedResponse(response.data, query);
  },

  async getById(id: string): Promise<Announcement> {
    const response = await announcementsClient.get<Announcement>(`/announcements/admin/${id}`);
    return normalizeAnnouncement(response.data);
  },

  async create(payload: AnnouncementPayload): Promise<Announcement> {
    const response = await announcementsClient.post<Announcement>("/announcements/admin", payload);
    return normalizeAnnouncement(response.data);
  },

  async update(id: string, payload: Partial<AnnouncementPayload>): Promise<Announcement> {
    const response = await announcementsClient.patch<Announcement>(
      `/announcements/admin/${id}`,
      payload
    );
    return normalizeAnnouncement(response.data);
  },

  async publish(id: string): Promise<Announcement> {
    const response = await announcementsClient.patch<Announcement>(
      `/announcements/admin/${id}/publish`
    );
    return normalizeAnnouncement(response.data);
  },

  async unpublish(id: string): Promise<Announcement> {
    const response = await announcementsClient.patch<Announcement>(
      `/announcements/admin/${id}/unpublish`
    );
    return normalizeAnnouncement(response.data);
  },

  async remove(id: string): Promise<void> {
    await announcementsClient.delete(`/announcements/admin/${id}`);
  },

  async uploadImage(file: File): Promise<AnnouncementUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await announcementsClient.post<AnnouncementUploadResponse>(
      "/announcements/admin/upload/image",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" }
      }
    );
    return response.data;
  }
};
