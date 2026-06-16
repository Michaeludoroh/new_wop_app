import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import * as Sentry from '@sentry/node';
import { ObservabilityService } from '../../observability/observability.service';
import {
  AnalyticsRefreshPayload,
  AnnouncementRealtimePayload,
  NotificationReadStatePayload,
  NotificationRealtimePayload,
  PaymentRealtimePayload,
  RealtimeActor,
  RealtimeAudience,
  RealtimeEventEnvelope,
  RealtimeEventType,
  SubscriptionRealtimePayload,
} from './realtime.types';

type AuthedSocket = Socket & {
  data: {
    actor?: RealtimeActor;
    joinedAt?: string;
  };
};

@Injectable()
@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  private readonly recentEventIds = new Set<string>();
  private readonly recentEventQueue: string[] = [];
  private readonly dedupeLimit = 2000;

  private readonly health = {
    activeConnections: 0,
    authenticatedConnections: 0,
    totalConnections: 0,
    authFailures: 0,
    unauthorizedDisconnects: 0,
    staleSessionDisconnects: 0,
    tokenExpiryDisconnects: 0,
    emittedEvents: 0,
    emitFailures: 0,
    duplicateDrops: 0,
    reconnects: 0,
    disconnects: 0,
    eventCounters: {
      notificationCreated: 0,
      notificationUpdated: 0,
      notificationReadStateChanged: 0,
      announcementPublished: 0,
      paymentUpdated: 0,
      subscriptionUpdated: 0,
      analyticsRefresh: 0,
    },
  };

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly observability: ObservabilityService,
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        role: RealtimeActor['role'];
      }>(token);

      if (!payload?.sub || !payload?.role) {
        throw new UnauthorizedException('Invalid realtime token payload');
      }

      client.data.actor = { userId: payload.sub, role: payload.role };
      client.data.joinedAt = new Date().toISOString();

      client.join(this.roomForUser(payload.sub));
      client.join(this.roomForRole(payload.role));

      this.health.activeConnections += 1;
      this.health.authenticatedConnections += 1;
      this.health.totalConnections += 1;
      if (this.hasReconnectHint(client)) {
        this.health.reconnects += 1;
      }

      this.logger.log(
        `Realtime connected user=${payload.sub} role=${payload.role} socket=${client.id}`,
      );
      this.observability.setWebsocketActiveConnections(this.health.activeConnections);
      if (this.hasReconnectHint(client)) {
        this.observability.incrementWebsocketReconnects();
      }
    } catch (error) {
      this.health.authFailures += 1;
      this.logger.warn(
        `Realtime auth failure socket=${client.id}: ${(error as Error).message}`,
      );
      this.observability.recordAuthFailure('websocket_handshake');
      this.observability.recordWebsocketFailure('unauthorized_handshake');
      Sentry.captureException(error);
      this.health.unauthorizedDisconnects += 1;
      client.emit('realtime.error', {
        code: 'REALTIME_UNAUTHORIZED',
        message: 'Unauthorized realtime connection',
        disconnect: true,
        reason: 'unauthorized_handshake',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket): void {
    if (this.health.activeConnections > 0) {
      this.health.activeConnections -= 1;
    }
    if (client.data.actor && this.health.authenticatedConnections > 0) {
      this.health.authenticatedConnections -= 1;
    }
    this.health.disconnects += 1;
    this.observability.setWebsocketActiveConnections(this.health.activeConnections);
    this.observability.recordWebsocketDisconnect(client.data.actor ? 'client_disconnect' : 'unauthorized');
    this.logger.log(`Realtime disconnected socket=${client.id}`);
  }

  @SubscribeMessage('realtime.ping')
  onPing(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: unknown) {
    if (!client.data.actor) {
      this.health.staleSessionDisconnects += 1;
      this.health.unauthorizedDisconnects += 1;
      this.observability.recordWebsocketFailure('stale_session');
      client.emit('realtime.error', {
        code: 'REALTIME_STALE_SESSION',
        message: 'Stale realtime session',
        disconnect: true,
        reason: 'stale_session',
      });
      client.disconnect(true);
      return {
        type: 'realtime.pong',
        receivedAt: new Date().toISOString(),
        rejected: true,
      };
    }

    return {
      type: 'realtime.pong',
      receivedAt: new Date().toISOString(),
      echo: body ?? null,
      actor: client.data.actor,
    };
  }

  emitNotificationCreated(payload: NotificationRealtimePayload): void {
    const audience = payload.userId
      ? ({ mode: 'user', userId: payload.userId } as const)
      : ({ mode: 'broadcast' } as const);
    const envelope = this.buildEnvelope('notification.created', payload, audience);
    this.health.eventCounters.notificationCreated += 1;
    this.emitEnvelope(envelope);
  }

  emitNotificationUpdated(payload: NotificationRealtimePayload): void {
    const audience = payload.userId
      ? ({ mode: 'user', userId: payload.userId } as const)
      : ({ mode: 'broadcast' } as const);
    const envelope = this.buildEnvelope('notification.updated', payload, audience);
    this.health.eventCounters.notificationUpdated += 1;
    this.emitEnvelope(envelope);
  }

  emitNotificationReadStateChanged(payload: NotificationReadStatePayload): void {
    const audience = payload.userId
      ? ({ mode: 'user', userId: payload.userId } as const)
      : ({ mode: 'broadcast' } as const);
    const envelope = this.buildEnvelope('notification.read_state_changed', payload, audience);
    this.health.eventCounters.notificationReadStateChanged += 1;
    this.emitEnvelope(envelope);
  }

  emitAnnouncementPublished(payload: AnnouncementRealtimePayload): void {
    const envelope = this.buildEnvelope(
      'announcement.published',
      payload,
      { mode: 'broadcast' } as const,
    );
    this.health.eventCounters.announcementPublished += 1;
    this.emitEnvelope(envelope);
  }

  emitPaymentUpdated(payload: PaymentRealtimePayload): void {
    const envelope = this.buildEnvelope(
      'payment.updated',
      payload,
      { mode: 'user', userId: payload.userId } as const,
    );
    this.health.eventCounters.paymentUpdated += 1;
    this.emitEnvelope(envelope);
  }

  emitSubscriptionUpdated(payload: SubscriptionRealtimePayload): void {
    const envelope = this.buildEnvelope(
      'subscription.updated',
      payload,
      { mode: 'user', userId: payload.userId } as const,
    );
    this.health.eventCounters.subscriptionUpdated += 1;
    this.emitEnvelope(envelope);
  }

  emitAnalyticsRefresh(payload: AnalyticsRefreshPayload): void {
    const envelope = this.buildEnvelope(
      'analytics.refresh',
      payload,
      { mode: 'role', role: 'ADMIN' } as const,
    );
    this.health.eventCounters.analyticsRefresh += 1;
    this.emitEnvelope(envelope);
    const superAdminEnvelope = this.buildEnvelope(
      'analytics.refresh',
      payload,
      { mode: 'role', role: 'SUPER_ADMIN' } as const,
    );
    this.emitEnvelope(superAdminEnvelope);
  }

  getHealthSummary() {
    return {
      websocketOperationalStatus: this.server ? 'UP' : 'DEGRADED',
      ...this.health,
      dedupeCacheSize: this.recentEventIds.size,
      observedAt: new Date().toISOString(),
    };
  }

  private emitEnvelope<TPayload>(envelope: RealtimeEventEnvelope<TPayload>) {
    if (this.isDuplicateEvent(envelope.eventId)) {
      this.health.duplicateDrops += 1;
      return;
    }

    if (envelope.audience.mode === 'user') {
      this.server
        .to(this.roomForUser(envelope.audience.userId))
        .emit(envelope.type, envelope);
    } else if (envelope.audience.mode === 'role') {
      this.server
        .to(this.roomForRole(envelope.audience.role))
        .emit(envelope.type, envelope);
    } else {
      this.server.emit(envelope.type, envelope);
    }

    this.health.emittedEvents += 1;
  }

  private buildEnvelope<TPayload>(
    type: RealtimeEventType,
    payload: TPayload,
    audience: RealtimeAudience,
  ): RealtimeEventEnvelope<TPayload> {
    return {
      eventId: this.generateEventId(type, payload),
      emittedAt: new Date().toISOString(),
      type,
      audience,
      payload,
    };
  }

  private isDuplicateEvent(eventId: string): boolean {
    if (this.recentEventIds.has(eventId)) {
      return true;
    }

    this.recentEventIds.add(eventId);
    this.recentEventQueue.push(eventId);

    if (this.recentEventQueue.length > this.dedupeLimit) {
      const stale = this.recentEventQueue.shift();
      if (stale) {
        this.recentEventIds.delete(stale);
      }
    }

    return false;
  }

  private generateEventId(type: RealtimeEventType, payload: unknown): string {
    const payloadHash = Buffer.from(JSON.stringify(payload)).toString('base64url').slice(0, 16);
    return `${type}:${Date.now()}:${payloadHash}`;
  }

  private extractToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7).trim();
    }

    throw new UnauthorizedException('Missing realtime authentication token');
  }

  private hasReconnectHint(client: Socket): boolean {
    return Boolean(client.handshake.auth?.reconnect === true);
  }

  private roomForUser(userId: string) {
    return `user:${userId}`;
  }

  private roomForRole(role: RealtimeActor['role']) {
    return `role:${role}`;
  }
}
