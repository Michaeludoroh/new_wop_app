import { createAuthenticatedClient } from "../auth/http-client";
import { Clip, ClipListQuery, ClipListResponse, ClipPayload } from "./types";

const clipsClient = createAuthenticatedClient();

type UploadResult = { url: string; key: string };

function normalizeListResponse(data: unknown): ClipListResponse {
  if (data && typeof data === "object") {
    const map = data as Partial<ClipListResponse>;
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

function unwrapClip(data: unknown): Clip {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: Clip }).data;
  }
  return data as Clip;
}

export const clipsApi = {
  async list(query?: ClipListQuery): Promise<ClipListResponse> {
    const response = await clipsClient.get<unknown>("/clips/admin", {
      params: query
    });
    return normalizeListResponse(response.data);
  },

  async create(payload: ClipPayload): Promise<Clip> {
    const response = await clipsClient.post<unknown>("/clips/admin", payload);
    return unwrapClip(response.data);
  },

  async update(id: string, payload: Partial<ClipPayload>): Promise<Clip> {
    const response = await clipsClient.patch<unknown>(`/clips/admin/${id}`, payload);
    return unwrapClip(response.data);
  },

  async publish(id: string): Promise<Clip> {
    const response = await clipsClient.patch<unknown>(`/clips/admin/${id}/publish`);
    return unwrapClip(response.data);
  },

  async unpublish(id: string): Promise<Clip> {
    const response = await clipsClient.patch<unknown>(`/clips/admin/${id}/unpublish`);
    return unwrapClip(response.data);
  },

  async remove(id: string): Promise<void> {
    await clipsClient.delete(`/clips/admin/${id}`);
  },

  async uploadMedia(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await clipsClient.post<UploadResult>("/clips/admin/upload/media", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  async uploadThumbnail(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await clipsClient.post<UploadResult>("/clips/admin/upload/thumbnail", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  }
};
