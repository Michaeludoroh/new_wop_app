import { Module, forwardRef } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { EmailModule } from '../email/email.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { RolesGuard } from './guards/roles.guard';
import { readJwtAccessSecret } from './jwt-config.util';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    EmailModule,
    forwardRef(() => SubscriptionsModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtAccessSecret = readJwtAccessSecret(configService);

        const expiresIn =
          (configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
            '15m') as StringValue;

        return {
          secret: jwtAccessSecret,
          signOptions: {
            expiresIn,
            algorithm: 'HS256',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailVerificationService, JwtStrategy, Reflector, RolesGuard],
  exports: [AuthService, EmailVerificationService, RolesGuard],
})
export class AuthModule {}
