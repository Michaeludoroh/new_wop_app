import { ForbiddenException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InitiateEbookCheckoutDto } from './dto/initiate-ebook-checkout.dto';
import { InitiateSubscriptionCheckoutDto } from './dto/initiate-subscription-checkout.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history-query.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

export const CARD_CHECKOUT_DISABLED = {
  code: 'CARD_CHECKOUT_DISABLED',
  message:
    'Card checkout is no longer available. Subscribe with Apple In-App Purchase on iOS or Google Play Billing on Android.',
} as const;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  rejectCardCheckout(): never {
    throw new GoneException(CARD_CHECKOUT_DISABLED);
  }

  async initiateSubscriptionCheckout(_userId: string, _dto: InitiateSubscriptionCheckoutDto) {
    this.rejectCardCheckout();
  }

  async initiateEbookCheckout(_userId: string, _dto: InitiateEbookCheckoutDto) {
    this.rejectCardCheckout();
  }

  async completeCheckout(_providerReference: string) {
    this.rejectCardCheckout();
  }

  createWebhookDto(
    _provider: string,
    _signature: string | undefined,
    _payload: Record<string, unknown>,
  ): PaymentWebhookDto {
    this.rejectCardCheckout();
  }

  async processWebhook(_dto: PaymentWebhookDto) {
    this.rejectCardCheckout();
  }

  async getHistory(requestingUserId: string, role: string, query: PaymentHistoryQueryDto) {
    const isElevated = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const targetUserId = isElevated ? query.userId : requestingUserId;

    const transactions = await this.prisma.paymentTransaction.findMany({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        status: query.status,
      },
      include: {
        userSubscription: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return { data: transactions };
  }

  async getStatus(requestingUserId: string, role: string, providerReference: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { providerReference },
      include: {
        userSubscription: { include: { plan: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException({
        code: 'PAYMENT_TRANSACTION_NOT_FOUND',
        message: 'Payment transaction not found',
      });
    }

    const isElevated = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!isElevated && transaction.userId !== requestingUserId) {
      throw new ForbiddenException('You can only inspect your own payment status');
    }

    return { data: transaction };
  }

  async listWebhookEvents() {
    const events = await this.prisma.paymentWebhookEvent.findMany({
      orderBy: [{ receivedAt: 'desc' }],
      take: 100,
      include: {
        paymentTransaction: true,
      },
    });

    return { data: events };
  }
}
