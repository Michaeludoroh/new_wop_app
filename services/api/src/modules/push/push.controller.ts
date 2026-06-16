import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PushService } from './push.service';
import {
  RefreshDeviceTokenDto,
  RegisterDeviceTokenDto,
  RevokeDeviceTokenDto,
} from './dto/device-token.dto';

type AuthedRequest = {
  user: {
    sub: string;
    role: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  };
};

@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('device-token/register')
  registerDeviceToken(@Req() req: AuthedRequest, @Body() dto: RegisterDeviceTokenDto) {
    return this.pushService.registerToken(req.user, dto);
  }

  @Post('device-token/refresh')
  refreshDeviceToken(@Req() req: AuthedRequest, @Body() dto: RefreshDeviceTokenDto) {
    return this.pushService.refreshToken(req.user, dto);
  }

  @Post('device-token/revoke')
  revokeDeviceToken(@Req() req: AuthedRequest, @Body() dto: RevokeDeviceTokenDto) {
    return this.pushService.revokeToken(req.user, dto);
  }

  @Get('my-devices')
  myDevices(@Req() req: AuthedRequest) {
    return this.pushService.listMyDevices(req.user);
  }
}
