import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ObservabilityService } from './observability.service';
import { MetricsController } from './metrics.controller';

function createController(env: Record<string, string | undefined>) {
  const observability = {
    metricsText: jest.fn().mockResolvedValue('metrics-output'),
  } as unknown as ObservabilityService;

  const config = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;

  return new MetricsController(observability, config);
}

describe('MetricsController', () => {
  it('allows metrics without token in development when no token is configured', async () => {
    const controller = createController({ NODE_ENV: 'development' });

    await expect(controller.metrics({ headers: {} } as Request)).resolves.toBe('metrics-output');
  });

  it('requires token in production', async () => {
    const controller = createController({
      NODE_ENV: 'production',
      METRICS_AUTH_TOKEN: 'secret-token',
    });

    await expect(controller.metrics({ headers: {} } as Request)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts bearer token when configured', async () => {
    const controller = createController({
      NODE_ENV: 'production',
      METRICS_AUTH_TOKEN: 'secret-token',
    });

    await expect(
      controller.metrics({
        headers: { authorization: 'Bearer secret-token' },
      } as Request),
    ).resolves.toBe('metrics-output');
  });

  it('accepts x-metrics-token header when configured', async () => {
    const controller = createController({
      NODE_ENV: 'staging',
      METRICS_AUTH_TOKEN: 'secret-token',
    });

    await expect(
      controller.metrics({
        headers: { 'x-metrics-token': 'secret-token' },
      } as unknown as Request),
    ).resolves.toBe('metrics-output');
  });
});
