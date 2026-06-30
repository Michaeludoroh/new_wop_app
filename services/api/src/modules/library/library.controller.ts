import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePremium } from '../subscriptions/decorators/require-premium.decorator';
import { EbooksService } from '../ebooks/ebooks.service';

type AuthRequest = Request & {
  user: {
    sub: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('library')
export class LibraryController {
  constructor(private readonly ebooksService: EbooksService) {}

  @Roles('ADMIN', 'USER', 'MODERATOR')
  @RequirePremium()
  @Get()
  list(@Req() req: AuthRequest) {
    return this.ebooksService.listUserLibrary(req.user.sub);
  }
}
