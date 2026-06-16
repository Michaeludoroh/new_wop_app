import { Module } from '@nestjs/common';
import { ContentAccessService } from './content-access.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionLifecycleService,
    ContentAccessService,
  ],
  exports: [SubscriptionsService, SubscriptionLifecycleService, ContentAccessService],
})
export class SubscriptionsModule {}
