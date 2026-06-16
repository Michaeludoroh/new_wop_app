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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnnouncementsUploadService } from './announcements-upload.service';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

type AuthRequest = Request & {
  user: {
    sub: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  };
};

@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly service: AnnouncementsService,
    private readonly uploadService: AnnouncementsUploadService,
  ) {}

  @Get('public/categories')
  listPublicCategories() {
    return this.service.listCategories();
  }

  @Get('public')
  listPublic(@Query() query: AnnouncementQueryDto) {
    return this.service.listPublic(query);
  }

  @Get('public/:id')
  findPublicById(@Param('id') id: string) {
    return this.service.findPublicById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/categories')
  listAdminCategories() {
    return this.service.listCategories();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin')
  listAdmin(@Query() query: AnnouncementQueryDto) {
    return this.service.listAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/:id')
  findAdminById(@Param('id') id: string) {
    return this.service.findAdminById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('admin/upload/image')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadImage(@UploadedFile() file: { buffer?: Buffer; originalname?: string }) {
    return this.uploadService.saveImage(file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('admin')
  create(@Req() req: AuthRequest, @Body() dto: CreateAnnouncementDto) {
    return this.service.create(req.user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/:id')
  update(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.service.update(id, req.user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/:id/publish')
  publish(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.publish(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('admin/:id/unpublish')
  unpublish(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.unpublish(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete('admin/:id')
  remove(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.remove(id, req.user);
  }
}
