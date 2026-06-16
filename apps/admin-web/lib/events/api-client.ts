import { createAuthenticatedClient } from "../auth/http-client";
import {
  EventAttendeesResponse,
  EventItem,
  EventListQuery,
  EventListResponse,
  EventPayload
} from "./types";

const eventsClient = createAuthenticatedClient();

function normalizeListResponse(data: unknown): EventListResponse {
  if (data && typeof data === "object") {
    const map = data as Partial<EventListResponse>;
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

function unwrapEvent(data: unknown): EventItem {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: EventItem }).data;
  }
  return data as EventItem;
}

export const eventsApi = {
  async list(query?: EventListQuery): Promise<EventListResponse> {
    const response = await eventsClient.get<unknown>("/events/admin", {
      params: query
    });
    return normalizeListResponse(response.data);
  },

  async create(payload: EventPayload): Promise<EventItem> {
    const response = await eventsClient.post<unknown>("/events/admin", payload);
    return unwrapEvent(response.data);
  },

  async update(id: string, payload: Partial<EventPayload>): Promise<EventItem> {
    const response = await eventsClient.patch<unknown>(`/events/admin/${id}`, payload);
    return unwrapEvent(response.data);
  },

  async publish(id: string): Promise<EventItem> {
    const response = await eventsClient.patch<unknown>(`/events/admin/${id}/publish`);
    return unwrapEvent(response.data);
  },

  async unpublish(id: string): Promise<EventItem> {
    const response = await eventsClient.patch<unknown>(`/events/admin/${id}/unpublish`);
    return unwrapEvent(response.data);
  },

  async remove(id: string): Promise<void> {
    await eventsClient.delete(`/events/admin/${id}`);
  },

  async attendees(id: string): Promise<EventAttendeesResponse> {
    const response = await eventsClient.get<EventAttendeesResponse>(
      `/events/admin/${id}/attendees`
    );
    return response.data;
  }
};
