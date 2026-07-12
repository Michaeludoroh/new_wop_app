import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RestorePurchasesDto } from './dto/restore-purchases.dto';
import { VerifyApplePurchaseDto } from './dto/verify-apple-purchase.dto';
import { VerifyGooglePurchaseDto } from './dto/verify-google-purchase.dto';
import { MobileSubscriptionsService } from './mobile-subscriptions.service';

type AuthRequest = Request & {
  user: {
    sub: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mobile/subscriptions')
export class MobileSubscriptionsController {
  constructor(private readonly mobileSubscriptionsService: MobileSubscriptionsService) {}

  @Roles('ADMIN', 'USER')
  @Post('google/verify')
  verifyGoogle(@Req() req: AuthRequest, @Body() dto: VerifyGooglePurchaseDto) {
    return this.mobileSubscriptionsService.verifyGooglePurchase(req.user.sub, dto);
  }

  @Roles('ADMIN', 'USER')
  @Post('apple/verify')
  verifyApple(@Req() req: AuthRequest, @Body() dto: VerifyApplePurchaseDto) {
    return this.mobileSubscriptionsService.verifyApplePurchase(req.user.sub, dto);
  }

  @Roles('ADMIN', 'USER')
  @Get('status')
  status(@Req() req: AuthRequest) {
    return this.mobileSubscriptionsService.getStatus(req.user.sub);
  }

  @Roles('ADMIN', 'USER')
  @Post('restore')
  restore(@Req() req: AuthRequest, @Body() dto: RestorePurchasesDto) {
    return this.mobileSubscriptionsService.restorePurchases(req.user.sub, dto);
  }
}
