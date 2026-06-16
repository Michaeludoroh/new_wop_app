import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type RequestWithUser = {
  user: {
    sub: string;
    email: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractSessionMetadata(req: Request) {
    const deviceIdHeader = req.headers['x-device-id'];
    const deviceId = Array.isArray(deviceIdHeader)
      ? deviceIdHeader[0]
      : deviceIdHeader;

    const forwardedFor = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    const ipAddress =
      (typeof forwardedIp === 'string' ? forwardedIp.split(',')[0]?.trim() : null) ??
      req.ip ??
      null;

    return {
      deviceId: deviceId ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, this.extractSessionMetadata(req));
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.extractSessionMetadata(req));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto, this.extractSessionMetadata(req));
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: RequestWithUser) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[auth.me] authenticated request', {
        sub: req.user.sub,
        role: req.user.role,
      });
    }

    return this.authService.me(req.user.sub);
  }
}
