import { Module } from '@nestjs/common';
import { EbooksModule } from '../ebooks/ebooks.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { LibraryController } from './library.controller';

@Module({
  imports: [EbooksModule, SubscriptionsModule],
  controllers: [LibraryController],
})
export class LibraryModule {}
