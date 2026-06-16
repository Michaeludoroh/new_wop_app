import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FlutterwaveProviderAdapter } from './providers/flutterwave.provider';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';

@Module({
  imports: [SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentProviderRegistry,
    FlutterwaveProviderAdapter,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
