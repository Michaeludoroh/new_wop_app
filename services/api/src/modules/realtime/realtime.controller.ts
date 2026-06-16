import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RealtimeService } from './realtime.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('health')
  getHealth() {
    return this.realtimeService.getHealthSummary();
  }
}
