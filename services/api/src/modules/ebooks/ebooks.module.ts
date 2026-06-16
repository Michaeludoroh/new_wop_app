import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EbooksController } from './ebooks.controller';
import { EbooksStreamController } from './ebooks-stream.controller';
import { EbooksUploadService } from './ebooks-upload.service';
import { EbooksService } from './ebooks.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule, SubscriptionsModule],
  controllers: [EbooksController, EbooksStreamController],
  providers: [EbooksService, EbooksUploadService],
  exports: [EbooksService],
})
export class EbooksModule {}
