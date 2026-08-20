import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsUploadService } from './events-upload.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventsUploadService],
  exports: [EventsService],
})
export class EventsModule {}
