import { Controller, Get } from '@nestjs/common';
import { PlatformHealthService } from './platform-health.service';

@Controller('health')
export class PlatformHealthController {
  constructor(private readonly platformHealthService: PlatformHealthService) {}

  @Get('platform')
  async platformHealth() {
    return this.platformHealthService.getHealth(true);
  }
}
