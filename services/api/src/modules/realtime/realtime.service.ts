import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import {
  AnalyticsRefreshPayload,
  AnnouncementRealtimePayload,
  NotificationReadStatePayload,
  NotificationRealtimePayload,
  PaymentRealtimePayload,
  SubscriptionRealtimePayload,
} from './realtime.types';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitNotificationCreated(payload: NotificationRealtimePayload) {
    this.gateway.emitNotificationCreated(payload);
  }

  emitNotificationUpdated(payload: NotificationRealtimePayload) {
    this.gateway.emitNotificationUpdated(payload);
  }

  emitNotificationReadStateChanged(payload: NotificationReadStatePayload) {
    this.gateway.emitNotificationReadStateChanged(payload);
  }

  emitAnnouncementPublished(payload: AnnouncementRealtimePayload) {
    this.gateway.emitAnnouncementPublished(payload);
  }

  emitPaymentUpdated(payload: PaymentRealtimePayload) {
    this.gateway.emitPaymentUpdated(payload);
  }

  emitSubscriptionUpdated(payload: SubscriptionRealtimePayload) {
    this.gateway.emitSubscriptionUpdated(payload);
  }

  emitAnalyticsRefresh(payload: AnalyticsRefreshPayload) {
    this.gateway.emitAnalyticsRefresh(payload);
  }

  getHealthSummary() {
    return this.gateway.getHealthSummary();
  }
}
