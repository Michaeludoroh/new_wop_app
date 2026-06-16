import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    EmailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtAccessSecret = configService.get<string>('JWT_ACCESS_SECRET');
        if (!jwtAccessSecret) {
          throw new Error('JWT_ACCESS_SECRET is required');
        }

        const expiresIn =
          (configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
            '15m') as StringValue;

        return {
          secret: jwtAccessSecret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, Reflector, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
