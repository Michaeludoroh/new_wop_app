import { Module, forwardRef } from '@nestjs/common';
import { ContentAccessService } from './content-access.service';
import { PremiumAccessGuard } from './guards/premium-access.guard';
import { SubscriptionLifecycleScheduler } from './subscription-lifecycle.scheduler';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { TrialNotificationService } from './trial-notification.service';
import { PaymentsModule } from '../payments/payments.module';
import { PushModule } from '../push/push.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [forwardRef(() => PaymentsModule), PushModule, RealtimeModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionLifecycleService,
    SubscriptionLifecycleScheduler,
    ContentAccessService,
    TrialNotificationService,
    PremiumAccessGuard,
  ],
  exports: [
    SubscriptionsService,
    SubscriptionLifecycleService,
    ContentAccessService,
    PremiumAccessGuard,
  ],
})
export class SubscriptionsModule {}
