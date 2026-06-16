import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { FcmProvider } from './push.providers/fcm.provider';
import { PushProvider } from './push.providers/push-provider.interface';

@Module({
  imports: [PrismaModule],
  controllers: [PushController],
  providers: [
    PushService,
    FcmProvider,
    {
      provide: 'PUSH_PROVIDER',
      useExisting: FcmProvider,
    },
  ],
  exports: [PushService],
})
export class PushModule {}
