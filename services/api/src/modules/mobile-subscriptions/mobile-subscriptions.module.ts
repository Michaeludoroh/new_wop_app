import { Module, forwardRef } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MobileSubscriptionsController } from './mobile-subscriptions.controller';
import { MobileSubscriptionsService } from './mobile-subscriptions.service';
import { AppleReceiptVerificationService } from './providers/apple-receipt-verification.service';
import { GooglePlayVerificationService } from './providers/google-play-verification.service';

@Module({
  imports: [forwardRef(() => SubscriptionsModule), EmailModule],
  controllers: [MobileSubscriptionsController],
  providers: [
    MobileSubscriptionsService,
    GooglePlayVerificationService,
    AppleReceiptVerificationService,
  ],
  exports: [MobileSubscriptionsService],
})
export class MobileSubscriptionsModule {}
