import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class SubscriptionLifecycleScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionLifecycleScheduler.name);
  private running = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly lifecycleService: SubscriptionLifecycleService) {}

  onModuleInit() {
    const intervalMs = Number(process.env.SUBSCRIPTION_LIFECYCLE_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
    this.timer = setInterval(() => {
      void this.runLifecycle();
    }, intervalMs);
    this.logger.log(`Subscription lifecycle scheduler started (every ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runLifecycle() {
    if (this.running) {
      this.logger.debug('Skipping lifecycle run; previous job still in progress');
      return;
    }

    this.running = true;
    try {
      const result = await this.lifecycleService.processDueLifecycleEvents();
      if (result.processed > 0 || result.trialNotifications.sent > 0) {
        this.logger.log(
          `Lifecycle processed=${result.processed} trialNotifications=${result.trialNotifications.sent}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Scheduled lifecycle processing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
