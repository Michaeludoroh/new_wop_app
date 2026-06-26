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
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

type AuthRequest = Request & {
  user: {
    sub: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  };
};

@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Get('public')
  listPublic(@Query() query: EventQueryDto) {
    return this.service.listPublic(query);
  }

  @Get('public/featured')
  listFeatured(@Query() query: EventQueryDto) {
    return this.service.listFeatured(query);
  }

  @Get('public/:slugOrId')
  findPublicBySlugOrId(@Param('slugOrId') slugOrId: string) {
    return this.service.findPublicBySlugOrId(slugOrId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Get('me/rsvps')
  listMyRsvps(@Req() req: AuthRequest) {
    return this.service.listMyRsvps(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Get('me/:slugOrId/rsvp')
  getMyRsvp(@Param('slugOrId') slugOrId: string, @Req() req: AuthRequest) {
    return this.service.getMyRsvp(slugOrId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Post(':id/rsvp')
  rsvp(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.rsvp(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Delete(':id/rsvp')
  cancelRsvp(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.cancelRsvp(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin')
  listAdmin(@Query() query: EventQueryDto) {
    return this.service.listAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/:id')
  findAdminById(@Param('id') id: string) {
    return this.service.findAdminById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/:id/attendees')
  listAttendees(@Param('id') id: string) {
    return this.service.listAttendees(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Post('admin')
  create(@Body() dto: CreateEventDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Patch('admin/:id/publish')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Patch('admin/:id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.service.unpublish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
