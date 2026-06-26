import { Module, forwardRef } from '@nestjs/common';
import { FlutterwaveHealthController } from './flutterwave-health.controller';
import { FlutterwaveReadinessService } from './flutterwave-readiness.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FlutterwaveProviderAdapter } from './providers/flutterwave.provider';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';

@Module({
  imports: [forwardRef(() => SubscriptionsModule)],
  controllers: [PaymentsController, FlutterwaveHealthController],
  providers: [
    PaymentsService,
    PaymentProviderRegistry,
    FlutterwaveProviderAdapter,
    FlutterwaveReadinessService,
  ],
  exports: [PaymentsService, PaymentProviderRegistry, FlutterwaveReadinessService],
})
export class PaymentsModule {}
