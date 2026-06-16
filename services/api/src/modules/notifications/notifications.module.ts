import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { EmailModule } from '../email/email.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PrismaModule, RealtimeModule, PushModule, EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
