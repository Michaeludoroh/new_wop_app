import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MobilePlatform,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  StoreProvider,
  StoreSubscriptionStatus,
  SubscriptionStatus,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_PREMIUM_PLAN_CODE } from '../subscriptions/subscription-access.util';
import { SubscriptionLifecycleService } from '../subscriptions/subscription-lifecycle.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email-template.service';
import { RestorePurchasesDto } from './dto/restore-purchases.dto';
import { VerifyApplePurchaseDto } from './dto/verify-apple-purchase.dto';
import { VerifyGooglePurchaseDto } from './dto/verify-google-purchase.dto';
import {
  AppleReceiptVerificationService,
  mapApplePlatform,
  mapAppleProvider,
} from './providers/apple-receipt-verification.service';
import {
  GooglePlayVerificationService,
  mapGooglePlatform,
  mapGoogleProvider,
} from './providers/google-play-verification.service';

type VerifiedStorePurchase = {
  platform: MobilePlatform;
  provider: StoreProvider;
  productId: string;
  transactionId: string;
  purchaseToken: string | null;
  originalTransactionId: string | null;
  receiptData: string | null;
  purchaseDate: Date;
  expiryDate: Date;
  autoRenewStatus: boolean;
  status: StoreSubscriptionStatus;
  renewalStatus: string;
  rawPayload: Record<string, unknown>;
};

@Injectable()
export class MobileSubscriptionsService {
  private readonly logger = new Logger(MobileSubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googlePlayVerification: GooglePlayVerificationService,
    private readonly appleReceiptVerification: AppleReceiptVerificationService,
    private readonly lifecycleService: SubscriptionLifecycleService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async verifyGooglePurchase(userId: string, dto: VerifyGooglePurchaseDto) {
    const expectedProductId = this.googlePlayVerification.getConfiguredProductId();
    if (dto.productId !== expectedProductId) {
      throw new BadRequestException({
        code: 'INVALID_PRODUCT_ID',
        message: 'Unexpected Google Play product identifier',
      });
    }

    const verification = await this.googlePlayVerification.verifySubscriptionPurchase(
      dto.productId,
      dto.purchaseToken,
    );

    if (verification.status === StoreSubscriptionStatus.EXPIRED) {
      throw new UnauthorizedException({
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Google Play subscription has expired',
      });
    }

    const result = await this.persistVerifiedPurchase(userId, {
      platform: mapGooglePlatform(),
      provider: mapGoogleProvider(),
      productId: verification.productId,
      transactionId: verification.transactionId,
      purchaseToken: verification.purchaseToken,
      originalTransactionId: verification.transactionId,
      receiptData: null,
      purchaseDate: verification.purchaseDate,
      expiryDate: verification.expiryDate,
      autoRenewStatus: verification.autoRenewStatus,
      status: verification.status as StoreSubscriptionStatus,
      renewalStatus: verification.renewalStatus,
      rawPayload: verification.rawPayload,
    });

    if (!verification.acknowledged) {
      await this.googlePlayVerification.acknowledgeSubscriptionPurchase(
        verification.productId,
        verification.purchaseToken,
      );
    }

    return result;
  }

  async verifyApplePurchase(userId: string, dto: VerifyApplePurchaseDto) {
    const verification = await this.appleReceiptVerification.verifySubscriptionReceipt(
      dto.receiptData,
    );

    if (dto.productId && dto.productId !== verification.productId) {
      throw new BadRequestException({
        code: 'INVALID_PRODUCT_ID',
        message: 'Unexpected Apple product identifier',
      });
    }

    if (verification.status === StoreSubscriptionStatus.EXPIRED) {
      throw new UnauthorizedException({
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Apple subscription has expired',
      });
    }

    return this.persistVerifiedPurchase(userId, {
      platform: mapApplePlatform(),
      provider: mapAppleProvider(),
      productId: verification.productId,
      transactionId: verification.transactionId,
      purchaseToken: null,
      originalTransactionId: verification.originalTransactionId,
      receiptData: verification.receiptData,
      purchaseDate: verification.purchaseDate,
      expiryDate: verification.expiryDate,
      autoRenewStatus: verification.autoRenewStatus,
      status: verification.status as StoreSubscriptionStatus,
      renewalStatus: verification.renewalStatus,
      rawPayload: verification.rawPayload,
    });
  }

  async restorePurchases(userId: string, dto: RestorePurchasesDto) {
    const results: Array<{ productId: string; restored: boolean; reason?: string }> = [];

    for (const purchase of dto.purchases) {
      try {
        if (dto.platform === MobilePlatform.ANDROID) {
          if (!purchase.purchaseToken) {
            results.push({
              productId: purchase.productId,
              restored: false,
              reason: 'purchaseToken is required for Android restore',
            });
            continue;
          }

          await this.verifyGooglePurchase(userId, {
            productId: purchase.productId,
            purchaseToken: purchase.purchaseToken,
          });
        } else {
          if (!purchase.receiptData) {
            results.push({
              productId: purchase.productId,
              restored: false,
              reason: 'receiptData is required for iOS restore',
            });
            continue;
          }

          await this.verifyApplePurchase(userId, {
            receiptData: purchase.receiptData,
            productId: purchase.productId,
            transactionId: purchase.transactionId,
          });
        }

        results.push({ productId: purchase.productId, restored: true });
      } catch (error) {
        const reason =
          error instanceof Error
            ? error.message
            : 'Verification failed during restore';
        this.logger.warn(
          `Restore failed for user ${userId}, product ${purchase.productId}: ${reason}`,
        );
        results.push({ productId: purchase.productId, restored: false, reason });
      }
    }

    const status = await this.getStatus(userId);
    return {
      data: {
        results,
        status: status.data,
        summary: status.summary,
      },
    };
  }

  async getStatus(userId: string) {
    const storeSubscription = await this.prisma.storeSubscription.findFirst({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }],
    });

    const subscriptionStatus = await this.subscriptionsService.getMySubscription(userId);

    return {
      data: {
        store: storeSubscription
          ? {
              id: storeSubscription.id,
              platform: storeSubscription.platform,
              provider: storeSubscription.provider,
              productId: storeSubscription.productId,
              transactionId: storeSubscription.transactionId,
              originalTransactionId: storeSubscription.originalTransactionId,
              purchaseDate: storeSubscription.purchaseDate?.toISOString() ?? null,
              expiryDate: storeSubscription.expiryDate?.toISOString() ?? null,
              renewalStatus: storeSubscription.renewalStatus,
              autoRenewStatus: storeSubscription.autoRenewStatus,
              status: storeSubscription.status,
              updatedAt: storeSubscription.updatedAt.toISOString(),
            }
          : null,
        subscription: subscriptionStatus.data,
      },
      summary: subscriptionStatus.summary,
    };
  }

  private async persistVerifiedPurchase(userId: string, verified: VerifiedStorePurchase) {
    const duplicate = await this.findExistingPurchase(verified);
    if (duplicate && duplicate.userId !== userId) {
      this.logger.warn(
        `Replay attempt blocked: ${verified.provider} purchase already owned by another user`,
      );
      throw new ConflictException({
        code: 'PURCHASE_ALREADY_CLAIMED',
        message: 'This purchase is already linked to another account',
      });
    }

    if (duplicate && duplicate.userId === userId) {
      const synced = await this.syncExistingPurchase(userId, duplicate, verified);
      return {
        data: synced,
        message: 'Purchase already verified',
        idempotent: true,
      };
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: DEFAULT_PREMIUM_PLAN_CODE },
    });

    if (!plan || !plan.isActive) {
      throw new BadRequestException({
        code: 'PLAN_NOT_FOUND',
        message: 'Premium subscription plan is not configured',
      });
    }

    const now = new Date();
    const userSubscriptionStatus = this.mapToUserSubscriptionStatus(verified.status);

    const result = await this.prisma.$transaction(async (tx) => {
      const active = await tx.userSubscription.findFirst({
        where: {
          userId,
          status: {
            in: [
              SubscriptionStatus.PENDING,
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.GRACE,
            ],
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      });

      let userSubscriptionId: string;

      if (active) {
        const updated = await tx.userSubscription.update({
          where: { id: active.id },
          data: {
            planId: plan.id,
            status: userSubscriptionStatus,
            startedAt: active.startedAt ?? verified.purchaseDate,
            currentPeriodStart: verified.purchaseDate,
            currentPeriodEnd: verified.expiryDate,
            graceEndsAt:
              userSubscriptionStatus === SubscriptionStatus.GRACE
                ? verified.expiryDate
                : null,
            lastPaymentAt: now,
            cancelAtPeriodEnd: !verified.autoRenewStatus,
            metadata: {
              provider: verified.provider,
              platform: verified.platform,
              productId: verified.productId,
              transactionId: verified.transactionId,
              originalTransactionId: verified.originalTransactionId,
              purchaseToken: verified.purchaseToken,
            },
          },
        });
        userSubscriptionId = updated.id;

        if (active.status !== userSubscriptionStatus) {
          await this.lifecycleService.recordStatusChange(tx, {
            subscriptionId: updated.id,
            userId,
            fromStatus: active.status,
            toStatus: userSubscriptionStatus,
            reason: `Mobile store purchase verified (${verified.provider})`,
            metadata: {
              productId: verified.productId,
              transactionId: verified.transactionId,
            },
          });
        }
      } else {
        const created = await tx.userSubscription.create({
          data: {
            userId,
            planId: plan.id,
            status: userSubscriptionStatus,
            startedAt: verified.purchaseDate,
            currentPeriodStart: verified.purchaseDate,
            currentPeriodEnd: verified.expiryDate,
            graceEndsAt:
              userSubscriptionStatus === SubscriptionStatus.GRACE
                ? verified.expiryDate
                : null,
            lastPaymentAt: now,
            cancelAtPeriodEnd: !verified.autoRenewStatus,
            metadata: {
              provider: verified.provider,
              platform: verified.platform,
              productId: verified.productId,
              transactionId: verified.transactionId,
              originalTransactionId: verified.originalTransactionId,
              purchaseToken: verified.purchaseToken,
            },
          },
        });
        userSubscriptionId = created.id;

        await this.lifecycleService.recordStatusChange(tx, {
          subscriptionId: created.id,
          userId,
          fromStatus: null,
          toStatus: userSubscriptionStatus,
          reason: `Mobile store purchase verified (${verified.provider})`,
          metadata: {
            productId: verified.productId,
            transactionId: verified.transactionId,
          },
        });
      }

      const storeSubscription = await tx.storeSubscription.upsert({
        where: this.storeSubscriptionUniqueWhere(verified),
        create: {
          userId,
          userSubscriptionId,
          platform: verified.platform,
          provider: verified.provider,
          productId: verified.productId,
          transactionId: verified.transactionId,
          purchaseToken: verified.purchaseToken,
          originalTransactionId: verified.originalTransactionId,
          receiptData: verified.receiptData,
          purchaseDate: verified.purchaseDate,
          expiryDate: verified.expiryDate,
          renewalStatus: verified.renewalStatus,
          autoRenewStatus: verified.autoRenewStatus,
          status: verified.status,
          metadata: verified.rawPayload as Prisma.InputJsonValue,
        },
        update: {
          userSubscriptionId,
          transactionId: verified.transactionId,
          receiptData: verified.receiptData,
          purchaseDate: verified.purchaseDate,
          expiryDate: verified.expiryDate,
          renewalStatus: verified.renewalStatus,
          autoRenewStatus: verified.autoRenewStatus,
          status: verified.status,
          metadata: verified.rawPayload as Prisma.InputJsonValue,
        },
      });

      await tx.storePurchaseHistory.create({
        data: {
          userId,
          storeSubscriptionId: storeSubscription.id,
          platform: verified.platform,
          provider: verified.provider,
          productId: verified.productId,
          transactionId: verified.transactionId,
          purchaseToken: verified.purchaseToken,
          receiptData: verified.receiptData,
          purchaseDate: verified.purchaseDate,
          expiryDate: verified.expiryDate,
          renewalStatus: verified.renewalStatus,
          status: verified.status,
          verificationPayload: verified.rawPayload as Prisma.InputJsonValue,
        },
      });

      const paymentProvider =
        verified.provider === StoreProvider.GOOGLE_PLAY
          ? PaymentProvider.GOOGLE_PLAY
          : PaymentProvider.APPLE;

      const providerReference = verified.purchaseToken ?? verified.transactionId;
      const existingPayment = await tx.paymentTransaction.findUnique({
        where: { providerReference },
      });

      if (!existingPayment) {
        await tx.paymentTransaction.create({
          data: {
            userId,
            userSubscriptionId,
            subscriptionPlanId: plan.id,
            provider: paymentProvider,
            providerReference,
            transactionType: TransactionType.SUBSCRIPTION_INITIAL,
            amount: plan.amount,
            currency: plan.currency,
            status: PaymentStatus.SUCCESS,
            initiatedAt: verified.purchaseDate,
            paidAt: now,
            providerPayload: verified.rawPayload as Prisma.InputJsonValue,
            metadata: {
              purpose: 'SUBSCRIPTION',
              planCode: plan.code,
              platform: verified.platform,
              productId: verified.productId,
            },
          },
        });
      }

      return storeSubscription;
    });

    const status = await this.getStatus(userId);
    void this.sendSubscriptionConfirmationEmail(userId, verified, result.id);
    return {
      data: {
        store: {
          id: result.id,
          platform: result.platform,
          provider: result.provider,
          productId: result.productId,
          transactionId: result.transactionId,
          originalTransactionId: result.originalTransactionId,
          purchaseDate: result.purchaseDate?.toISOString() ?? null,
          expiryDate: result.expiryDate?.toISOString() ?? null,
          renewalStatus: result.renewalStatus,
          autoRenewStatus: result.autoRenewStatus,
          status: result.status,
        },
        subscription: status.data?.subscription ?? null,
      },
      summary: status.summary,
      message: 'Purchase verified and premium access granted',
      idempotent: false,
    };
  }

  private async syncExistingPurchase(
    userId: string,
    existing: { id: string; userSubscriptionId: string | null },
    verified: VerifiedStorePurchase,
  ) {
    const userSubscriptionStatus = this.mapToUserSubscriptionStatus(verified.status);

    const updated = await this.prisma.$transaction(async (tx) => {
      const storeSubscription = await tx.storeSubscription.update({
        where: { id: existing.id },
        data: {
          transactionId: verified.transactionId,
          purchaseDate: verified.purchaseDate,
          expiryDate: verified.expiryDate,
          renewalStatus: verified.renewalStatus,
          autoRenewStatus: verified.autoRenewStatus,
          status: verified.status,
          receiptData: verified.receiptData,
          metadata: verified.rawPayload as Prisma.InputJsonValue,
        },
      });

      if (existing.userSubscriptionId) {
        const current = await tx.userSubscription.findUnique({
          where: { id: existing.userSubscriptionId },
        });

        if (current) {
          await tx.userSubscription.update({
            where: { id: current.id },
            data: {
              status: userSubscriptionStatus,
              currentPeriodStart: verified.purchaseDate,
              currentPeriodEnd: verified.expiryDate,
              graceEndsAt:
                userSubscriptionStatus === SubscriptionStatus.GRACE
                  ? verified.expiryDate
                  : null,
              cancelAtPeriodEnd: !verified.autoRenewStatus,
              lastPaymentAt: new Date(),
            },
          });
        }
      }

      await tx.storePurchaseHistory.create({
        data: {
          userId,
          storeSubscriptionId: storeSubscription.id,
          platform: verified.platform,
          provider: verified.provider,
          productId: verified.productId,
          transactionId: verified.transactionId,
          purchaseToken: verified.purchaseToken,
          receiptData: verified.receiptData,
          purchaseDate: verified.purchaseDate,
          expiryDate: verified.expiryDate,
          renewalStatus: verified.renewalStatus,
          status: verified.status,
          verificationPayload: verified.rawPayload as Prisma.InputJsonValue,
        },
      });

      return storeSubscription;
    });

    const status = await this.getStatus(userId);
    return {
      store: status.data?.store,
      subscription: status.data?.subscription ?? null,
      summary: status.summary,
    };
  }

  private async findExistingPurchase(verified: VerifiedStorePurchase) {
    if (verified.provider === StoreProvider.GOOGLE_PLAY && verified.purchaseToken) {
      return this.prisma.storeSubscription.findUnique({
        where: {
          provider_purchaseToken: {
            provider: StoreProvider.GOOGLE_PLAY,
            purchaseToken: verified.purchaseToken,
          },
        },
      });
    }

    if (verified.originalTransactionId) {
      return this.prisma.storeSubscription.findUnique({
        where: {
          provider_originalTransactionId: {
            provider: StoreProvider.APPLE,
            originalTransactionId: verified.originalTransactionId,
          },
        },
      });
    }

    return null;
  }

  private storeSubscriptionUniqueWhere(verified: VerifiedStorePurchase) {
    if (verified.provider === StoreProvider.GOOGLE_PLAY && verified.purchaseToken) {
      return {
        provider_purchaseToken: {
          provider: StoreProvider.GOOGLE_PLAY,
          purchaseToken: verified.purchaseToken,
        },
      };
    }

    return {
      provider_originalTransactionId: {
        provider: StoreProvider.APPLE,
        originalTransactionId: verified.originalTransactionId ?? verified.transactionId,
      },
    };
  }

  private mapToUserSubscriptionStatus(status: StoreSubscriptionStatus): SubscriptionStatus {
    switch (status) {
      case StoreSubscriptionStatus.ACTIVE:
        return SubscriptionStatus.ACTIVE;
      case StoreSubscriptionStatus.GRACE:
        return SubscriptionStatus.GRACE;
      case StoreSubscriptionStatus.EXPIRED:
        return SubscriptionStatus.EXPIRED;
      case StoreSubscriptionStatus.CANCELLED:
        return SubscriptionStatus.CANCELLED;
      default:
        return SubscriptionStatus.PENDING;
    }
  }

  private async sendSubscriptionConfirmationEmail(
    userId: string,
    verified: VerifiedStorePurchase,
    storeSubscriptionId: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, fullName: true },
      });

      if (!user?.email) {
        return;
      }

      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { code: DEFAULT_PREMIUM_PLAN_CODE },
      });

      const amountLabel = plan
        ? `${plan.currency} ${Number(plan.amount).toFixed(2)}`
        : verified.productId;

      const providerLabel =
        verified.provider === StoreProvider.GOOGLE_PLAY ? 'Google Play' : 'Apple App Store';

      const content = this.emailTemplateService.subscriptionConfirmationEmail({
        fullName: user.fullName,
        planName: plan?.name ?? 'Premium Membership',
        amountLabel,
        expiresAt: verified.expiryDate,
        providerLabel,
      });

      await this.emailService.send([
        {
          to: user.email,
          subject: content.subject,
          body: content.body,
          html: content.html,
          dedupeKey: `subscription-confirmation:${verified.provider}:${verified.transactionId ?? storeSubscriptionId}`,
        },
      ]);
    } catch {
      // Email delivery must not block purchase verification.
    }
  }
}
