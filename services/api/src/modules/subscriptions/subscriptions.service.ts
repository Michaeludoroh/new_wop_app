import {

  BadRequestException,

  Injectable,

  NotFoundException,

  UnprocessableEntityException,

} from '@nestjs/common';

import {

  Prisma,

  SubscriptionStatus,

} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { AdminUpdateSubscriptionStatusDto } from './dto/admin-update-subscription-status.dto';

import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';

import { CreatePlanDto } from './dto/create-plan.dto';

import { SubscribeDto } from './dto/subscribe.dto';

import { SubscriberQueryDto } from './dto/subscriber-query.dto';

import { UpdatePlanDto } from './dto/update-plan.dto';

import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import {
  buildSubscriptionSummary,
  DEFAULT_PREMIUM_PLAN_CODE,
  hasPremiumAccess,
  isTrialActive,
  REGISTRATION_TRIAL_DAYS,
  trialDaysRemaining,
} from './subscription-access.util';



const PREMIUM_ACCESS_STATUSES: SubscriptionStatus[] = [

  SubscriptionStatus.ACTIVE,

  SubscriptionStatus.GRACE,

];



@Injectable()

export class SubscriptionsService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly lifecycleService: SubscriptionLifecycleService,

  ) {}



  async getPlans() {

    const plans = await this.prisma.subscriptionPlan.findMany({

      where: { isActive: true },

      orderBy: [{ amount: 'asc' }],

    });



    return { data: plans };

  }



  async createPlan(dto: CreatePlanDto) {

    try {

      const created = await this.prisma.subscriptionPlan.create({

        data: {

          code: dto.code.trim().toUpperCase(),

          name: dto.name.trim(),

          description: dto.description,

          amount: new Prisma.Decimal(dto.amount),

          currency: dto.currency.trim().toUpperCase(),

          billingInterval: dto.billingInterval,

          trialPeriodDays: dto.trialPeriodDays ?? 0,

          isActive: dto.isActive ?? true,

          recurringEnabled: dto.recurringEnabled ?? true,

          metadata: dto.metadata as Prisma.InputJsonValue | undefined,

        },

      });



      return { data: created };

    } catch (error) {

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {

        throw new BadRequestException({

          code: 'PLAN_CODE_EXISTS',

          message: 'A subscription plan with this code already exists',

        });

      }

      throw error;

    }

  }



  async updatePlan(id: string, dto: UpdatePlanDto) {

    await this.ensurePlanExists(id);



    const updated = await this.prisma.subscriptionPlan.update({

      where: { id },

      data: {

        code: dto.code?.trim().toUpperCase(),

        name: dto.name?.trim(),

        description: dto.description,

        amount:

          typeof dto.amount === 'number' ? new Prisma.Decimal(dto.amount) : undefined,

        currency: dto.currency?.trim().toUpperCase(),

        billingInterval: dto.billingInterval,

        trialPeriodDays: dto.trialPeriodDays,

        isActive: dto.isActive,

        recurringEnabled: dto.recurringEnabled,

        metadata: dto.metadata as Prisma.InputJsonValue | undefined,

      },

    });



    return { data: updated };

  }



  async deletePlan(id: string) {

    const plan = await this.ensurePlanExists(id);



    const activeSubscriptions = await this.prisma.userSubscription.count({

      where: {

        planId: id,

        status: { in: [SubscriptionStatus.PENDING, SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] },

      },

    });



    if (activeSubscriptions > 0) {

      throw new UnprocessableEntityException({

        code: 'PLAN_IN_USE',

        message: 'Cannot delete a plan with active subscriptions',

      });

    }



    await this.prisma.subscriptionPlan.delete({ where: { id: plan.id } });



    return { message: 'Plan deleted successfully' };

  }



  async subscribe(userId: string, dto: SubscribeDto) {

    const plan = await this.prisma.subscriptionPlan.findUnique({

      where: { code: dto.planCode.trim().toUpperCase() },

    });



    if (!plan || !plan.isActive) {

      throw new NotFoundException({

        code: 'PLAN_NOT_FOUND',

        message: 'Subscription plan not found or inactive',

      });

    }



    const requiresPayment = Number(plan.amount) > 0;

    if (requiresPayment) {

      throw new BadRequestException({

        code: 'CHECKOUT_REQUIRED',

        message: 'Paid subscriptions must be activated through verified Flutterwave checkout',

      });

    }



    const active = await this.prisma.userSubscription.findFirst({

      where: {

        userId,

        status: { in: [SubscriptionStatus.PENDING, SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] },

      },

      orderBy: [{ createdAt: 'desc' }],

    });



    const now = new Date();

    const trialEndsAt =

      plan.trialPeriodDays > 0

        ? new Date(now.getTime() + plan.trialPeriodDays * 24 * 60 * 60 * 1000)

        : null;



    const status = trialEndsAt ? SubscriptionStatus.PENDING : SubscriptionStatus.ACTIVE;



    const created = await this.prisma.$transaction(async (tx) => {

      if (active) {

        await tx.userSubscription.update({

          where: { id: active.id },

          data: {

            status: SubscriptionStatus.CANCELLED,

            cancelledAt: now,

            cancellationReason: 'Plan switched by user',

          },

        });

        await this.lifecycleService.recordStatusChange(tx, {

          subscriptionId: active.id,

          userId,

          fromStatus: active.status,

          toStatus: SubscriptionStatus.CANCELLED,

          reason: 'Plan switched by user',

        });

      }



      const subscription = await tx.userSubscription.create({

        data: {

          userId,

          planId: plan.id,

          status,

          startedAt: now,

          currentPeriodStart: now,

          trialStartedAt: trialEndsAt ? now : null,

          trialEndsAt,

          cancelAtPeriodEnd: dto.autoRenew === false,

          upgradeFromId: active?.id,

          metadata: dto.metadata as Prisma.InputJsonValue | undefined,

        },

      });



      await this.lifecycleService.recordStatusChange(tx, {

        subscriptionId: subscription.id,

        userId,

        fromStatus: null,

        toStatus: status,

        reason: 'Free subscription created',

      });



      return { subscription };

    });



    return {

      message: 'Subscription created successfully',

      data: created,

    };

  }



  async cancel(userId: string, dto: CancelSubscriptionDto) {

    const current = await this.prisma.userSubscription.findFirst({

      where: {

        userId,

        status: { in: [SubscriptionStatus.PENDING, SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] },

      },

      orderBy: [{ createdAt: 'desc' }],

    });



    if (!current) {

      throw new NotFoundException({

        code: 'SUBSCRIPTION_NOT_FOUND',

        message: 'No cancellable subscription found',

      });

    }



    const now = new Date();

    const immediate = dto.immediate ?? false;

    const nextStatus = immediate ? SubscriptionStatus.CANCELLED : current.status;



    const updated = await this.prisma.$transaction(async (tx) => {

      const subscription = await tx.userSubscription.update({

        where: { id: current.id },

        data: {

          status: nextStatus,

          cancelledAt: now,

          cancellationReason: dto.reason ?? null,

          cancelAtPeriodEnd: immediate ? false : true,

          graceEndsAt: immediate ? null : current.graceEndsAt,

        },

      });



      if (immediate) {

        await this.lifecycleService.recordStatusChange(tx, {

          subscriptionId: current.id,

          userId,

          fromStatus: current.status,

          toStatus: SubscriptionStatus.CANCELLED,

          reason: dto.reason ?? 'Cancelled immediately by user',

        });

      }



      return subscription;

    });



    return {

      message: immediate

        ? 'Subscription cancelled immediately'

        : 'Subscription will cancel at the end of the current period',

      data: this.toSubscriptionResponse(updated),

    };

  }



  async getMySubscription(userId: string) {

    const subscription = await this.prisma.userSubscription.findFirst({

      where: { userId },

      orderBy: [{ createdAt: 'desc' }],

      include: {

        plan: true,

        paymentTransactions: {

          orderBy: [{ createdAt: 'desc' }],

          take: 10,

        },

      },

    });



    if (!subscription) {

      return {

        data: null,

        summary: buildSubscriptionSummary(null),

      };

    }



    const response = this.toSubscriptionResponse(subscription);

    return {

      data: response,

      summary: buildSubscriptionSummary(subscription),

    };

  }



  async initializeRegistrationTrial(userId: string) {

    const existing = await this.prisma.userSubscription.findFirst({

      where: { userId },

      select: { id: true },

    });

    if (existing) {

      return null;

    }



    const plan = await this.prisma.subscriptionPlan.findUnique({

      where: { code: DEFAULT_PREMIUM_PLAN_CODE },

    });

    if (!plan || !plan.isActive) {

      return null;

    }



    const now = new Date();

    const trialEndsAt = new Date(

      now.getTime() + REGISTRATION_TRIAL_DAYS * 24 * 60 * 60 * 1000,

    );



    const created = await this.prisma.$transaction(async (tx) => {

      const subscription = await tx.userSubscription.create({

        data: {

          userId,

          planId: plan.id,

          status: SubscriptionStatus.PENDING,

          trialStartedAt: now,

          trialEndsAt,

          metadata: {

            isRegistrationTrial: true,

            purpose: 'REGISTRATION_TRIAL',

            planCode: plan.code,

          },

        },

      });



      await this.lifecycleService.recordStatusChange(tx, {

        subscriptionId: subscription.id,

        userId,

        fromStatus: null,

        toStatus: SubscriptionStatus.PENDING,

        reason: '7-day registration trial started',

      });



      return subscription;

    });



    return created;

  }



  async listAdminSubscribers(query: SubscriberQueryDto) {

    const limit = query.limit ?? 20;

    const offset = query.offset ?? 0;

    const where: Prisma.UserSubscriptionWhereInput = {

      ...(query.status ? { status: query.status as SubscriptionStatus } : {}),

      ...(query.planCode

        ? { plan: { code: { equals: query.planCode.trim().toUpperCase() } } }

        : {}),

      ...(query.search

        ? {

            user: {

              OR: [

                { email: { contains: query.search, mode: 'insensitive' } },

                { fullName: { contains: query.search, mode: 'insensitive' } },

              ],

            },

          }

        : {}),

    };



    const [items, total] = await this.prisma.$transaction([

      this.prisma.userSubscription.findMany({

        where,

        include: { user: true, plan: true },

        orderBy: [{ updatedAt: 'desc' }],

        skip: offset,

        take: limit,

      }),

      this.prisma.userSubscription.count({ where }),

    ]);



    return {

      data: items.map((item) => this.toSubscriptionResponse(item)),

      total,

      limit,

      offset,

    };

  }



  async getAdminAnalytics() {

    const now = new Date();

    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);



    const [

      active,

      grace,

      pending,

      cancelled,

      expired,

      expiringSoon,

      mrrRows,

      recentHistory,

    ] = await Promise.all([

      this.prisma.userSubscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),

      this.prisma.userSubscription.count({ where: { status: SubscriptionStatus.GRACE } }),

      this.prisma.userSubscription.count({ where: { status: SubscriptionStatus.PENDING } }),

      this.prisma.userSubscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),

      this.prisma.userSubscription.count({ where: { status: SubscriptionStatus.EXPIRED } }),

      this.prisma.userSubscription.count({

        where: {

          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE] },

          currentPeriodEnd: { lte: sevenDays, gte: now },

        },

      }),

      this.prisma.userSubscription.findMany({

        where: { status: { in: PREMIUM_ACCESS_STATUSES } },

        include: { plan: true },

      }),

      this.prisma.subscriptionStatusHistory.findMany({

        orderBy: [{ createdAt: 'desc' }],

        take: 10,

        include: {

          user: { select: { email: true, fullName: true } },

        },

      }),

    ]);



    const mrr = mrrRows.reduce((sum, row) => sum + Number(row.plan.amount), 0);



    return {

      totals: {

        active,

        grace,

        pending,

        cancelled,

        expired,

        expiringSoon,

        mrr,

        premiumAccess: active + grace,

      },

      recentTransitions: recentHistory.map((entry) => ({

        id: entry.id,

        userEmail: entry.user.email,

        userName: entry.user.fullName,

        fromStatus: entry.fromStatus,

        toStatus: entry.toStatus,

        reason: entry.reason,

        createdAt: entry.createdAt,

      })),

    };

  }



  async getSubscriberById(id: string) {

    const subscription = await this.prisma.userSubscription.findUnique({

      where: { id },

      include: { user: true, plan: true, paymentTransactions: { orderBy: [{ createdAt: 'desc' }], take: 20 } },

    });



    if (!subscription) {

      throw new NotFoundException('Subscription not found');

    }



    return { data: this.toSubscriptionResponse(subscription) };

  }



  async getStatusHistory(id: string) {

    await this.ensureSubscription(id);

    const history = await this.prisma.subscriptionStatusHistory.findMany({

      where: { subscriptionId: id },

      orderBy: [{ createdAt: 'desc' }],

      take: 50,

    });



    return { data: history };

  }



  async adminUpdateStatus(id: string, dto: AdminUpdateSubscriptionStatusDto) {

    const subscription = await this.ensureSubscription(id);

    const updated = await this.prisma.$transaction(async (tx) => {

      const next = await tx.userSubscription.update({

        where: { id },

        data: {

          status: dto.status,

          graceEndsAt:

            dto.status === SubscriptionStatus.GRACE

              ? this.lifecycleService.buildGraceEndsAt()

              : dto.status === SubscriptionStatus.ACTIVE

                ? null

                : subscription.graceEndsAt,

          cancelledAt:

            dto.status === SubscriptionStatus.CANCELLED || dto.status === SubscriptionStatus.EXPIRED

              ? new Date()

              : subscription.cancelledAt,

        },

        include: { user: true, plan: true },

      });



      await this.lifecycleService.recordStatusChange(tx, {

        subscriptionId: id,

        userId: subscription.userId,

        fromStatus: subscription.status,

        toStatus: dto.status,

        reason: dto.reason ?? 'Updated by administrator',

      });



      return next;

    });



    return { data: this.toSubscriptionResponse(updated) };

  }



  async adminCancelSubscription(id: string, dto: CancelSubscriptionDto) {

    const subscription = await this.ensureSubscription(id);

    return this.cancel(subscription.userId, { ...dto, immediate: dto.immediate ?? true });

  }



  async userHasPremiumAccess(userId: string) {

    const subscription = await this.prisma.userSubscription.findFirst({

      where: { userId },

      orderBy: [{ createdAt: 'desc' }],

    });



    return hasPremiumAccess(subscription);

  }



  private toSubscriptionResponse(

    subscription: {

      id: string;

      userId: string;

      status: SubscriptionStatus;

      startedAt: Date | null;

      currentPeriodStart: Date | null;

      currentPeriodEnd: Date | null;

      trialEndsAt: Date | null;

      cancelledAt: Date | null;

      cancellationReason: string | null;

      cancelAtPeriodEnd: boolean;

      graceEndsAt: Date | null;

      retryCount: number;

      maxRetryCount: number;

      nextRetryAt: Date | null;

      lastPaymentAttemptAt: Date | null;

      createdAt: Date;

      updatedAt: Date;

      plan?: {

        id: string;

        code: string;

        name: string;

        amount: Prisma.Decimal;

        billingInterval: string;

      };

      user?: {

        id: string;

        email: string;

        fullName: string;

      };

    },

  ) {

    const hasPremiumAccessFlag = hasPremiumAccess(subscription);

    const isGracePeriod = subscription.status === SubscriptionStatus.GRACE;

    const trialActive = isTrialActive(subscription);

    const daysRemaining = trialDaysRemaining(subscription);

    const daysRemainingInGrace =

      subscription.graceEndsAt != null

        ? Math.max(

            0,

            Math.ceil(

              (subscription.graceEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),

            ),

          )

        : null;

    const renewalDue =

      subscription.currentPeriodEnd != null &&

      subscription.currentPeriodEnd.getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000;



    return {

      ...subscription,

      plan: subscription.plan,

      user: subscription.user,

      access: {

        hasPremiumAccess: hasPremiumAccessFlag,

        isTrial: trialActive,

        trialEndsAt: subscription.trialEndsAt,

        daysRemaining,

        isSubscribed: PREMIUM_ACCESS_STATUSES.includes(subscription.status),

        subscriptionRequired: !hasPremiumAccessFlag,

        isGracePeriod,

        graceEndsAt: subscription.graceEndsAt,

        daysRemainingInGrace,

        renewalDue,

        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,

      },

    };

  }



  private async ensurePlanExists(id: string) {

    const plan = await this.prisma.subscriptionPlan.findUnique({

      where: { id },

    });



    if (!plan) {

      throw new NotFoundException({

        code: 'PLAN_NOT_FOUND',

        message: 'Subscription plan was not found',

      });

    }



    return plan;

  }



  private async ensureSubscription(id: string) {

    const subscription = await this.prisma.userSubscription.findUnique({ where: { id } });

    if (!subscription) {

      throw new NotFoundException('Subscription not found');

    }

    return subscription;

  }

}


