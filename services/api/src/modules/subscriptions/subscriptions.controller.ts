import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContentAccessService } from './content-access.service';
import { AdminUpdateSubscriptionStatusDto } from './dto/admin-update-subscription-status.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscriberQueryDto } from './dto/subscriber-query.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { SubscriptionsService } from './subscriptions.service';

type AuthRequest = Request & {
  user: {
    sub: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly lifecycleService: SubscriptionLifecycleService,
    private readonly contentAccessService: ContentAccessService,
  ) {}

  @Roles('ADMIN', 'USER')
  @Get('plans')
  plans() {
    return this.subscriptionsService.getPlans();
  }

  @Roles('ADMIN')
  @Post('plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Roles('ADMIN')
  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Roles('ADMIN')
  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.subscriptionsService.deletePlan(id);
  }

  @Roles('ADMIN')
  @Get('admin/analytics')
  analytics() {
    return this.subscriptionsService.getAdminAnalytics();
  }

  @Roles('ADMIN')
  @Post('admin/lifecycle/process')
  processLifecycle() {
    return this.lifecycleService.processDueLifecycleEvents();
  }

  @Roles('ADMIN')
  @Get('admin')
  listAdmin(@Query() query: SubscriberQueryDto) {
    return this.subscriptionsService.listAdminSubscribers(query);
  }

  @Roles('ADMIN')
  @Get('admin/:id/history')
  history(@Param('id') id: string) {
    return this.subscriptionsService.getStatusHistory(id);
  }

  @Roles('ADMIN')
  @Get('admin/:id')
  findAdminById(@Param('id') id: string) {
    return this.subscriptionsService.getSubscriberById(id);
  }

  @Roles('ADMIN')
  @Patch('admin/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: AdminUpdateSubscriptionStatusDto) {
    return this.subscriptionsService.adminUpdateStatus(id, dto);
  }

  @Roles('ADMIN')
  @Post('admin/:id/cancel')
  adminCancel(@Param('id') id: string, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionsService.adminCancelSubscription(id, dto);
  }

  @Roles('ADMIN', 'USER')
  @Get('content/validate')
  validateContentAccess(
    @Req() req: AuthRequest,
    @Query('token') token: string,
    @Query('resourceType') resourceType: 'ebook' | 'clip' | 'program',
    @Query('resourceId') resourceId: string,
  ) {
    return this.contentAccessService.validateAccessToken(token, {
      userId: req.user.sub,
      resourceType,
      resourceId,
    });
  }

  @Roles('ADMIN', 'USER')
  @Post('subscribe')
  subscribe(@Req() req: AuthRequest, @Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(req.user.sub, dto);
  }

  @Roles('ADMIN', 'USER')
  @Post('cancel')
  cancel(@Req() req: AuthRequest, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionsService.cancel(req.user.sub, dto);
  }

  @Roles('ADMIN', 'USER')
  @Get('me')
  me(@Req() req: AuthRequest) {
    return this.subscriptionsService.getMySubscription(req.user.sub);
  }

  @Roles('ADMIN', 'USER')
  @Get('status')
  status(@Req() req: AuthRequest) {
    return this.subscriptionsService.getMySubscription(req.user.sub);
  }
}
