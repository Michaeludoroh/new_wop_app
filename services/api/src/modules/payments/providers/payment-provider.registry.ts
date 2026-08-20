import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PaymentProviderAdapter } from './payment-provider.interface';

@Injectable()
export class PaymentProviderRegistry {
  private readonly adapters = new Map<PaymentProvider, PaymentProviderAdapter>();

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
