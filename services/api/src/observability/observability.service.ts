import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class ObservabilityService {
  private readonly registry = new Registry();

  private readonly apiRequestCounter: Counter<string>;
  private readonly apiRequestDuration: Histogram<string>;
  private readonly apiErrorCounter: Counter<string>;
  private readonly authFailureCounter: Counter<string>;
  private readonly paymentFailureCounter: Counter<string>;
  private readonly notificationFailureCounter: Counter<string>;
  private readonly websocketFailureCounter: Counter<string>;
  private readonly websocketConnectionsGauge: Gauge<string>;
  private readonly websocketReconnectCounter: Counter<string>;
  private readonly websocketDisconnectCounter: Counter<string>;
  private readonly dbFailureCounter: Counter<string>;
  private readonly redisConnectivityGauge: Gauge<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.apiRequestCounter = new Counter({
      name: 'api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.apiRequestDuration = new Histogram({
      name: 'api_request_duration_seconds',
      help: 'API request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.apiErrorCounter = new Counter({
      name: 'api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['route', 'type'],
      registers: [this.registry],
    });

    this.authFailureCounter = new Counter({
      name: 'auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    this.paymentFailureCounter = new Counter({
      name: 'payment_failures_total',
      help: 'Total number of payment failures',
      labelNames: ['provider', 'reason'],
      registers: [this.registry],
    });

    this.notificationFailureCounter = new Counter({
      name: 'notification_failures_total',
      help: 'Total number of notification failures',
      labelNames: ['channel', 'reason'],
      registers: [this.registry],
    });

    this.websocketFailureCounter = new Counter({
      name: 'websocket_failures_total',
      help: 'Total number of websocket failures',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    this.websocketConnectionsGauge = new Gauge({
      name: 'websocket_active_connections',
      help: 'Current active websocket connections',
      registers: [this.registry],
    });

    this.websocketReconnectCounter = new Counter({
      name: 'websocket_reconnects_total',
      help: 'Total number of websocket reconnect cycles',
      registers: [this.registry],
    });

    this.websocketDisconnectCounter = new Counter({
      name: 'websocket_disconnects_total',
      help: 'Total number of websocket disconnects',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    this.dbFailureCounter = new Counter({
      name: 'database_failures_total',
      help: 'Total number of database failures',
      labelNames: ['operation'],
      registers: [this.registry],
    });

    this.redisConnectivityGauge = new Gauge({
      name: 'redis_connectivity_status',
      help: 'Redis connectivity status (1 connected, 0 disconnected)',
      registers: [this.registry],
    });

    this.redisConnectivityGauge.set(1);
  }

  getRegistry() {
    return this.registry;
  }

  async metricsText() {
    return this.registry.metrics();
  }

  observeApiRequest(method: string, route: string, status: number, durationMs: number) {
    const labels = { method, route, status: String(status) };
    this.apiRequestCounter.inc(labels);
    this.apiRequestDuration.observe(labels, durationMs / 1000);
    if (status >= 500) {
      this.apiErrorCounter.inc({ route, type: 'server_error' });
    }
  }

  recordAuthFailure(reason: string) {
    this.authFailureCounter.inc({ reason });
  }

  recordPaymentFailure(provider: string, reason: string) {
    this.paymentFailureCounter.inc({ provider, reason });
  }

  recordNotificationFailure(channel: string, reason: string) {
    this.notificationFailureCounter.inc({ channel, reason });
  }

  recordWebsocketFailure(reason: string) {
    this.websocketFailureCounter.inc({ reason });
  }

  setWebsocketActiveConnections(count: number) {
    this.websocketConnectionsGauge.set(count);
  }

  incrementWebsocketReconnects() {
    this.websocketReconnectCounter.inc();
  }

  recordWebsocketDisconnect(reason: string) {
    this.websocketDisconnectCounter.inc({ reason });
  }

  recordDatabaseFailure(operation: string) {
    this.dbFailureCounter.inc({ operation });
  }

  setRedisConnectivity(connected: boolean) {
    this.redisConnectivityGauge.set(connected ? 1 : 0);
  }
}
