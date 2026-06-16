import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { join } from 'path';
import compression = require('compression');
import * as express from 'express';
import pinoHttp from 'pino-http';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ObservabilityService } from './observability/observability.service';

const isProdLike = ['production', 'staging'].includes(process.env.NODE_ENV ?? 'development');
const sentryEnabled = Boolean(process.env.SENTRY_DSN);

function buildCorsOrigin() {
  const configured = process.env.CORS_ORIGIN;
  if (!configured) {
    return isProdLike ? false : true;
  }
  return configured.split(',').map((v) => v.trim());
}

async function bootstrap() {
  if (sentryEnabled) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
      release: process.env.SENTRY_RELEASE ?? process.env.RELEASE ?? 'api@dev',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? (isProdLike ? 0.1 : 1)),
      integrations: [nodeProfilingIntegration()],
      profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? 0),
      sendDefaultPii: false,
    });
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const expressApp = app.getHttpAdapter().getInstance();
  const observability = app.get(ObservabilityService);

  expressApp.set('trust proxy', isProdLike ? 1 : 0);

  app.use(
    pinoHttp({
      genReqId: (req) => (req.headers['x-correlation-id'] as string) || randomUUID(),
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie'],
        censor: '[REDACTED]',
      },
      customProps: (req, res) => ({
        correlationId: req.id,
        route: req.url,
        method: req.method,
        statusCode: res.statusCode,
      }),
      transport:
        process.env.NODE_ENV === 'development' && process.env.ENABLE_PRETTY_LOGS === 'true'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    }),
  );

  app.use((req: Request & { id?: string }, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    const correlationId = (req.headers['x-correlation-id'] as string) || req.id || randomUUID();
    res.setHeader('X-Correlation-Id', correlationId);

    res.on('finish', () => {
      const elapsedNs = Number(process.hrtime.bigint() - start);
      const durationMs = elapsedNs / 1_000_000;
      const route = (req.route?.path as string) || req.path || req.url || 'unknown_route';
      observability.observeApiRequest(req.method, route, res.statusCode, durationMs);

      if (sentryEnabled && res.statusCode >= 500) {
        Sentry.captureMessage('api_response_5xx', {
          level: 'error',
          tags: {
            route,
            method: req.method,
            statusCode: String(res.statusCode),
          },
          extra: {
            correlationId,
            durationMs,
          },
        });
      }
    });

    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: isProdLike ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  expressApp.use('/api/v1/uploads/ebooks/file', (_req: Request, res: Response) => {
    res.status(403).json({
      message:
        'Direct eBook file access is disabled. Request access via /ebooks/:id/access and use the secured stream URL.',
    });
  });
  expressApp.use('/api/v1/uploads', express.static(join(process.cwd(), 'uploads')));

  app.enableCors({
    origin: buildCorsOrigin(),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
    exposedHeaders: ['X-Correlation-Id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: { target: false, value: false },
    }),
  );

  app.setGlobalPrefix('api/v1');

  app.enableShutdownHooks();

  process.on('unhandledRejection', (reason) => {
    if (sentryEnabled) {
      Sentry.captureException(reason);
    }
    console.error('[runtime] unhandledRejection', reason);
    observability.recordDatabaseFailure('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    if (sentryEnabled) {
      Sentry.captureException(error);
      Sentry.flush(2000).catch(() => undefined);
    }
    console.error('[runtime] uncaughtException', error);
    observability.recordDatabaseFailure('uncaughtException');
    process.exit(1);
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  const shutdown = async (signal: string) => {
    console.log(`[runtime] received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  console.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();
