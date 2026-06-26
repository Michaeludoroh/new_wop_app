import { Controller, Get } from '@nestjs/common';
import { EmailReadinessService } from './email-readiness.service';

@Controller('health')
export class EmailHealthController {
  constructor(private readonly emailReadinessService: EmailReadinessService) {}

  @Get('email')
  async emailHealth() {
    const snapshot = await this.emailReadinessService.refreshConnectionTest();

    return {
      status: snapshot.ready ? 'ready' : snapshot.provider === 'MOCK_SMTP' ? 'mock' : 'not_ready',
      email: snapshot,
      timestamp: new Date().toISOString(),
    };
  }
}
