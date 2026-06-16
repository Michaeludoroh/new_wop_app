import { createAuthenticatedClient } from "../auth/http-client";
import {
  PaymentHistoryResponse,
  PaymentStatus,
  PaymentWebhookEventsResponse
} from "./types";

const client = createAuthenticatedClient();

export type PaymentHistoryQuery = {
  status?: PaymentStatus;
  userId?: string;
};

export const paymentsApi = {
  async getHistory(query?: PaymentHistoryQuery): Promise<PaymentHistoryResponse> {
    const response = await client.get<PaymentHistoryResponse>("/payments/history", {
      params: query
    });
    return response.data;
  },

  async getWebhookEvents(): Promise<PaymentWebhookEventsResponse> {
    const response = await client.get<PaymentWebhookEventsResponse>("/payments/webhook-events");
    return response.data;
  }
};
