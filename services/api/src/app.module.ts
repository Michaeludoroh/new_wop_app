import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { ClipsModule } from './modules/clips/clips.module';
import { EventsModule } from './modules/events/events.module';
import { EbooksModule } from './modules/ebooks/ebooks.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { MentorshipModule } from './modules/mentorship/mentorship.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { PushModule } from './modules/push/push.module';
import { LibraryModule } from './modules/library/library.module';
import { validateSecurityConfig } from './config/security-config.validation';
import { ObservabilityModule } from './observability/observability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateSecurityConfig,
      // Root monorepo .env is canonical so JWT secrets stay consistent across Docker and local dev.
      envFilePath: [join(process.cwd(), '../../.env'), join(process.cwd(), '.env')],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: Number(process.env.RATE_LIMIT_TTL_MS ?? 60_000),
          limit: Number(process.env.RATE_LIMIT_LIMIT ?? 100),
        },
      ],
    }),
    ObservabilityModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    PaymentsModule,
    AnnouncementsModule,
    ClipsModule,
    EventsModule,
    EbooksModule,
    PoliciesModule,
    ProgramsModule,
    MentorshipModule,
    NotificationsModule,
    AnalyticsModule,
    RealtimeModule,
    PushModule,
    LibraryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
