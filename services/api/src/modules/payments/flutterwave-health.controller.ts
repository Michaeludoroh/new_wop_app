import { Controller, Get } from '@nestjs/common';
import { FlutterwaveReadinessService } from './flutterwave-readiness.service';

@Controller('health')
export class FlutterwaveHealthController {
  constructor(private readonly flutterwaveReadinessService: FlutterwaveReadinessService) {}

  @Get('flutterwave')
  async flutterwaveHealth() {
    const snapshot = await this.flutterwaveReadinessService.refreshConnectionTest();

    return {
      status: snapshot.ready
        ? 'ready'
        : snapshot.provider === 'NOT_CONFIGURED'
          ? 'not_configured'
          : 'not_ready',
      flutterwave: snapshot,
      timestamp: new Date().toISOString(),
    };
  }
}
