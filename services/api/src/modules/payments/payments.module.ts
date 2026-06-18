import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FlutterwaveProviderAdapter } from './providers/flutterwave.provider';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';

@Module({
  imports: [forwardRef(() => SubscriptionsModule)],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentProviderRegistry,
    FlutterwaveProviderAdapter,
  ],
  exports: [PaymentsService, PaymentProviderRegistry],
})
export class PaymentsModule {}
