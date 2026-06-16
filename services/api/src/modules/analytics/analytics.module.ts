import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
