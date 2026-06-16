import { createAuthenticatedClient } from "../auth/http-client";
import {
  MentorshipAnalyticsResponse,
  MentorshipAttendanceStatus,
  MentorshipFeedback,
  MentorshipItem,
  MentorshipListQuery,
  MentorshipListResponse,
  MentorshipParticipantsResponse,
  MentorshipPayload,
  MentorshipProgressRecord,
  MentorshipSession,
  SessionAttendanceResponse,
  SessionPayload
} from "./types";

const mentorshipClient = createAuthenticatedClient();

function normalizeListResponse(data: unknown): MentorshipListResponse {
  if (data && typeof data === "object") {
    const map = data as Partial<MentorshipListResponse>;
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

function unwrapItem(data: unknown): MentorshipItem {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: MentorshipItem }).data;
  }
  return data as MentorshipItem;
}

export const mentorshipApi = {
  async list(query?: MentorshipListQuery): Promise<MentorshipListResponse> {
    const response = await mentorshipClient.get<unknown>("/mentorship/admin", { params: query });
    return normalizeListResponse(response.data);
  },

  async analytics(): Promise<MentorshipAnalyticsResponse> {
    const response = await mentorshipClient.get<MentorshipAnalyticsResponse>("/mentorship/admin/analytics");
    return response.data;
  },

  async create(payload: MentorshipPayload): Promise<MentorshipItem> {
    const response = await mentorshipClient.post<unknown>("/mentorship/admin", payload);
    return unwrapItem(response.data);
  },

  async update(id: string, payload: Partial<MentorshipPayload>): Promise<MentorshipItem> {
    const response = await mentorshipClient.patch<unknown>(`/mentorship/admin/${id}`, payload);
    return unwrapItem(response.data);
  },

  async publish(id: string): Promise<MentorshipItem> {
    const response = await mentorshipClient.patch<unknown>(`/mentorship/admin/${id}/publish`);
    return unwrapItem(response.data);
  },

  async unpublish(id: string): Promise<MentorshipItem> {
    const response = await mentorshipClient.patch<unknown>(`/mentorship/admin/${id}/unpublish`);
    return unwrapItem(response.data);
  },

  async remove(id: string): Promise<void> {
    await mentorshipClient.delete(`/mentorship/admin/${id}`);
  },

  async participants(id: string): Promise<MentorshipParticipantsResponse> {
    const response = await mentorshipClient.get<MentorshipParticipantsResponse>(
      `/mentorship/admin/${id}/participants`
    );
    return response.data;
  },

  async sessions(id: string): Promise<{ data: MentorshipSession[] }> {
    const response = await mentorshipClient.get<{ data: MentorshipSession[] }>(
      `/mentorship/admin/${id}/sessions`
    );
    return response.data;
  },

  async createSession(id: string, payload: SessionPayload): Promise<MentorshipSession> {
    const response = await mentorshipClient.post<{ data: MentorshipSession }>(
      `/mentorship/admin/${id}/sessions`,
      payload
    );
    return response.data.data;
  },

  async updateSession(sessionId: string, payload: Partial<SessionPayload>): Promise<MentorshipSession> {
    const response = await mentorshipClient.patch<{ data: MentorshipSession }>(
      `/mentorship/admin/sessions/${sessionId}`,
      payload
    );
    return response.data.data;
  },

  async removeSession(sessionId: string): Promise<void> {
    await mentorshipClient.delete(`/mentorship/admin/sessions/${sessionId}`);
  },

  async sessionAttendance(sessionId: string): Promise<SessionAttendanceResponse> {
    const response = await mentorshipClient.get<SessionAttendanceResponse>(
      `/mentorship/admin/sessions/${sessionId}/attendance`
    );
    return response.data;
  },

  async markAttendance(
    sessionId: string,
    userId: string,
    payload: { status: MentorshipAttendanceStatus; notes?: string }
  ): Promise<void> {
    await mentorshipClient.patch(
      `/mentorship/admin/sessions/${sessionId}/attendance/${userId}`,
      payload
    );
  },

  async feedback(id: string): Promise<{ data: MentorshipFeedback[] }> {
    const response = await mentorshipClient.get<{ data: MentorshipFeedback[] }>(
      `/mentorship/admin/${id}/feedback`
    );
    return response.data;
  },

  async progress(id: string): Promise<{ data: MentorshipProgressRecord[] }> {
    const response = await mentorshipClient.get<{ data: MentorshipProgressRecord[] }>(
      `/mentorship/admin/${id}/progress`
    );
    return response.data;
  }
};
