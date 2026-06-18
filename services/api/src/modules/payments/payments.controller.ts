import { Controller, Get, Headers, Param, Post, Body, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InitiateEbookCheckoutDto } from './dto/initiate-ebook-checkout.dto';
import { InitiateSubscriptionCheckoutDto } from './dto/initiate-subscription-checkout.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history-query.dto';
import { PaymentStatusQueryDto } from './dto/payment-status-query.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentsService } from './payments.service';

type AuthRequest = Request & {
  user: {
    sub: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  };
};

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'USER')
  @Post('checkout/subscription')
  initiateSubscriptionCheckout(
    @Req() req: AuthRequest,
    @Body() dto: InitiateSubscriptionCheckoutDto,
  ) {
    return this.service.initiateSubscriptionCheckout(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'USER')
  @Post('checkout/ebook')
  initiateEbookCheckout(@Req() req: AuthRequest, @Body() dto: InitiateEbookCheckoutDto) {
    return this.service.initiateEbookCheckout(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'USER')
  @Get('status')
  status(@Req() req: AuthRequest, @Query() query: PaymentStatusQueryDto) {
    return this.service.getStatus(req.user.sub, req.user.role, query.providerReference);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'USER')
  @Get('history')
  history(@Req() req: AuthRequest, @Query() query: PaymentHistoryQueryDto) {
    return this.service.getHistory(req.user.sub, req.user.role, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('webhook-events')
  webhookEvents() {
    return this.service.listWebhookEvents();
  }

  @Post('webhooks/:provider')
  webhook(
    @Param('provider') provider: string,
    @Headers('verif-hash') signature: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.processWebhook(
      this.service.createWebhookDto(provider, signature, payload),
    );
  }

  @Get('complete')
  async complete(
    @Query('tx_ref') txRef: string,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.completeCheckout(txRef ?? '');
    if (format === 'json') {
      return result;
    }

    res.type('html');
    return this.service.buildCompletionHtml(result);
  }
}
