import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateBroadcastNotificationDto } from './dto/create-broadcast-notification.dto';
import { CreateTargetedNotificationDto } from './dto/create-targeted-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';
import { RequestUser } from './dto/notification-request.types';
import { NotificationsService } from './notifications.service';

type RequestWithUser = {
  user: RequestUser;
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Roles('SUPER_ADMIN', 'ADMIN', 'USER')
  @Get()
  findAll(
    @Req() req: RequestWithUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.service.listForUser(req.user, query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'USER')
  @Get(':id')
  findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.service.findOneForUser(req.user, id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('broadcast')
  createBroadcast(
    @Req() req: RequestWithUser,
    @Body() dto: CreateBroadcastNotificationDto,
  ) {
    return this.service.createBroadcast(req.user, dto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('targeted')
  createTargeted(
    @Req() req: RequestWithUser,
    @Body() dto: CreateTargetedNotificationDto,
  ) {
    return this.service.createTargeted(req.user, dto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'USER')
  @Patch(':id/read-state')
  markReadState(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: MarkNotificationReadDto,
  ) {
    return this.service.markReadState(req.user, id, dto.isRead);
  }
}
