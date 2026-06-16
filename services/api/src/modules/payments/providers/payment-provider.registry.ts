import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { FlutterwaveProviderAdapter } from './flutterwave.provider';
import { PaymentProviderAdapter } from './payment-provider.interface';

@Injectable()
export class PaymentProviderRegistry {
  private readonly adapters = new Map<PaymentProvider, PaymentProviderAdapter>();

  constructor(
    flutterwaveAdapter: FlutterwaveProviderAdapter,
  ) {
    this.adapters.set(PaymentProvider.FLUTTERWAVE, flutterwaveAdapter);
  }

  resolve(provider: PaymentProvider): PaymentProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_PAYMENT_PROVIDER',
        message: `Unsupported payment provider: ${provider}`,
      });
    }
    return adapter;
  }
}
