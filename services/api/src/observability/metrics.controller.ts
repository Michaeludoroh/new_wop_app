import { Controller, ForbiddenException, Get, Header, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ObservabilityService } from './observability.service';

@Controller()
export class MetricsController {
  constructor(
    private readonly observability: ObservabilityService,
    private readonly configService: ConfigService,
  ) {}

  @Get('/metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(@Req() req: Request) {
    this.assertMetricsAccess(req);
    return this.observability.metricsText();
  }

  private assertMetricsAccess(req: Request) {
    const expectedToken = this.configService.get<string>('METRICS_AUTH_TOKEN');
    const isProdLike = ['production', 'staging'].includes(
      this.configService.get<string>('NODE_ENV') ?? 'development',
    );

    if (!expectedToken && !isProdLike) {
      return;
    }

    if (!expectedToken) {
      throw new ForbiddenException('Metrics token is required in this environment');
    }

    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice('Bearer '.length)
      : null;
    const headerToken = req.headers['x-metrics-token'];
    const suppliedToken =
      bearer ??
      (Array.isArray(headerToken) ? headerToken[0] : headerToken) ??
      null;

    if (suppliedToken !== expectedToken) {
      throw new ForbiddenException('Metrics access denied');
    }
  }
}
