import { Module, forwardRef } from '@nestjs/common';
import { ContentAccessService } from './content-access.service';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [forwardRef(() => PaymentsModule)],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionLifecycleService,
    ContentAccessService,
  ],
  exports: [SubscriptionsService, SubscriptionLifecycleService, ContentAccessService],
})
export class SubscriptionsModule {}
