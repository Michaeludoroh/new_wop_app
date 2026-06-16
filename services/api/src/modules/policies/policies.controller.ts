import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PolicyType, Role } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AcceptPolicyDto } from './dto/accept-policy.dto';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { PolicyQueryDto } from './dto/policy-query.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PoliciesService } from './policies.service';

type AuthRequest = Request & {
  user: {
    sub: string;
    role: Role;
  };
};

@Controller('policies')
export class PoliciesController {
  constructor(private readonly service: PoliciesService) {}

  @Get('public/types')
  listPublicTypes() {
    return this.service.listTypes();
  }

  @Get('public/current/:type')
  findCurrentByType(@Param('type') type: PolicyType) {
    return this.service.findCurrentByType(type);
  }

  @Get('public/slug/:slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.service.findPublicBySlug(slug);
  }

  @Get('public/:id')
  findPublicById(@Param('id') id: string) {
    return this.service.findPublicById(id);
  }

  @Get('public')
  listPublic(@Query() query: PolicyQueryDto) {
    return this.service.listPublic(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Get('me/status')
  getAcceptanceStatus(@Req() req: AuthRequest) {
    return this.service.getAcceptanceStatus(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Post('me/accept')
  acceptPolicy(@Req() req: AuthRequest, @Body() dto: AcceptPolicyDto) {
    return this.service.acceptPolicy(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/publish-readiness')
  getPublishReadiness() {
    return this.service.getPublishReadiness();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/analytics/acceptance')
  getAcceptanceAnalytics() {
    return this.service.getAcceptanceAnalytics();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/types')
  listAdminTypes() {
    return this.service.listTypes();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/history/:type')
  listVersionHistory(@Param('type') type: PolicyType) {
    return this.service.listVersionHistory(type);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/:id')
  findAdminById(@Param('id') id: string) {
    return this.service.findAdminById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin')
  listAdmin(@Query() query: PolicyQueryDto) {
    return this.service.listAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Post('admin')
  create(@Req() req: AuthRequest, @Body() dto: CreatePolicyDto) {
    return this.service.create(req.user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Patch('admin/:id')
  update(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() dto: UpdatePolicyDto,
  ) {
    return this.service.update(id, req.user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Patch('admin/:id/publish')
  publish(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.publish(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Patch('admin/:id/unpublish')
  unpublish(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.unpublish(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Delete('admin/:id')
  remove(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.remove(id, req.user);
  }
}
