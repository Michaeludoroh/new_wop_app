import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnnouncementsUploadService } from './announcements-upload.service';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, AnnouncementsUploadService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
