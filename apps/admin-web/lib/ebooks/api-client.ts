import { createAuthenticatedClient } from "../auth/http-client";
import {
  EbookAnalytics,
  EbookItem,
  EbookListQuery,
  EbookListResponse,
  EbookPayload,
  UploadResult
} from "./types";

const ebooksClient = createAuthenticatedClient();

function normalizeListResponse(data: unknown): EbookListResponse {
  if (data && typeof data === "object") {
    const map = data as Partial<EbookListResponse>;
    if (Array.isArray(map.data)) {
      return {
        data: map.data,
        total: typeof map.total === "number" ? map.total : map.data.length,
        limit: typeof map.limit === "number" ? map.limit : map.data.length,
        offset: typeof map.offset === "number" ? map.offset : 0
      };
    }
  }

  return { data: [], total: 0, limit: 20, offset: 0 };
}

function unwrapEbook(data: unknown): EbookItem {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: EbookItem }).data;
  }
  return data as EbookItem;
}

export const ebooksApi = {
  async list(query?: EbookListQuery): Promise<EbookListResponse> {
    const response = await ebooksClient.get<unknown>("/ebooks/admin", { params: query });
    return normalizeListResponse(response.data);
  },

  async create(payload: EbookPayload): Promise<EbookItem> {
    const response = await ebooksClient.post<unknown>("/ebooks/admin", payload);
    return unwrapEbook(response.data);
  },

  async update(id: string, payload: Partial<EbookPayload>): Promise<EbookItem> {
    const response = await ebooksClient.patch<unknown>(`/ebooks/admin/${id}`, payload);
    return unwrapEbook(response.data);
  },

  async publish(id: string): Promise<EbookItem> {
    const response = await ebooksClient.patch<unknown>(`/ebooks/admin/${id}/publish`);
    return unwrapEbook(response.data);
  },

  async unpublish(id: string): Promise<EbookItem> {
    const response = await ebooksClient.patch<unknown>(`/ebooks/admin/${id}/unpublish`);
    return unwrapEbook(response.data);
  },

  async remove(id: string): Promise<void> {
    await ebooksClient.delete(`/ebooks/admin/${id}`);
  },

  async analytics(): Promise<EbookAnalytics> {
    const response = await ebooksClient.get<EbookAnalytics>("/ebooks/admin/analytics");
    return response.data;
  },

  async categories(): Promise<string[]> {
    const response = await ebooksClient.get<{ data: string[] }>("/ebooks/admin/categories");
    return response.data.data ?? [];
  },

  async uploadFile(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await ebooksClient.post<UploadResult>("/ebooks/admin/upload/file", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  async uploadCover(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await ebooksClient.post<UploadResult>("/ebooks/admin/upload/cover", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  }
};
