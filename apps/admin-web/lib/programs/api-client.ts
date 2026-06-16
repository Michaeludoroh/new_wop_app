import { createAuthenticatedClient } from "../auth/http-client";
import {
  ProgramAnalyticsResponse,
  ProgramEnrollmentsResponse,
  ProgramItem,
  ProgramListQuery,
  ProgramListResponse,
  ProgramPayload,
  ProgramProgressResponse
} from "./types";

const programsClient = createAuthenticatedClient();

function normalizeListResponse(data: unknown): ProgramListResponse {
  if (data && typeof data === "object") {
    const map = data as Partial<ProgramListResponse>;
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

function unwrapProgram(data: unknown): ProgramItem {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: ProgramItem }).data;
  }
  return data as ProgramItem;
}

export const programsApi = {
  async list(query?: ProgramListQuery): Promise<ProgramListResponse> {
    const response = await programsClient.get<unknown>("/programs/admin", {
      params: query
    });
    return normalizeListResponse(response.data);
  },

  async analytics(): Promise<ProgramAnalyticsResponse> {
    const response = await programsClient.get<ProgramAnalyticsResponse>("/programs/admin/analytics");
    return response.data;
  },

  async create(payload: ProgramPayload): Promise<ProgramItem> {
    const response = await programsClient.post<unknown>("/programs/admin", payload);
    return unwrapProgram(response.data);
  },

  async update(id: string, payload: Partial<ProgramPayload>): Promise<ProgramItem> {
    const response = await programsClient.patch<unknown>(`/programs/admin/${id}`, payload);
    return unwrapProgram(response.data);
  },

  async publish(id: string): Promise<ProgramItem> {
    const response = await programsClient.patch<unknown>(`/programs/admin/${id}/publish`);
    return unwrapProgram(response.data);
  },

  async unpublish(id: string): Promise<ProgramItem> {
    const response = await programsClient.patch<unknown>(`/programs/admin/${id}/unpublish`);
    return unwrapProgram(response.data);
  },

  async remove(id: string): Promise<void> {
    await programsClient.delete(`/programs/admin/${id}`);
  },

  async enrollments(id: string): Promise<ProgramEnrollmentsResponse> {
    const response = await programsClient.get<ProgramEnrollmentsResponse>(
      `/programs/admin/${id}/enrollments`
    );
    return response.data;
  },

  async progress(id: string): Promise<ProgramProgressResponse> {
    const response = await programsClient.get<ProgramProgressResponse>(
      `/programs/admin/${id}/progress`
    );
    return response.data;
  }
};
