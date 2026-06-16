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
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateEbookDto } from './dto/create-ebook.dto';
import { EbookQueryDto } from './dto/ebook-query.dto';
import { ReadingProgressDto } from './dto/reading-progress.dto';
import { UpdateEbookDto } from './dto/update-ebook.dto';
import { EbooksUploadService } from './ebooks-upload.service';
import { EbooksService } from './ebooks.service';

type AuthRequest = Request & {
  user: {
    sub: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ebooks')
export class EbooksController {
  constructor(
    private readonly service: EbooksService,
    private readonly uploadService: EbooksUploadService,
  ) {}

  @Roles('ADMIN', 'USER', 'MODERATOR')
  @Get()
  findAll(@Query() query: EbookQueryDto) {
    return this.service.findAll(query);
  }

  @Roles('ADMIN', 'USER', 'MODERATOR')
  @Get('recently-read')
  recentlyRead(@Req() req: AuthRequest, @Query('limit') limit?: string) {
    return this.service.getRecentlyRead(req.user.sub, limit ? Number(limit) : 10);
  }

  @Roles('ADMIN', 'USER', 'MODERATOR')
  @Get('library')
  library(@Req() req: AuthRequest) {
    return this.service.listUserLibrary(req.user.sub);
  }

  @Roles('ADMIN', 'MODERATOR')
  @Get('admin/analytics')
  analytics() {
    return this.service.getLibraryAnalytics();
  }

  @Roles('ADMIN', 'MODERATOR')
  @Get('admin/categories')
  categories() {
    return this.service.listCategories();
  }

  @Roles('ADMIN', 'MODERATOR')
  @Get('admin')
  listAdmin(@Query() query: EbookQueryDto) {
    return this.service.listAdmin(query);
  }

  @Roles('ADMIN', 'MODERATOR')
  @Get('admin/:id')
  findAdminById(@Param('id') id: string) {
    return this.service.findAdminById(id);
  }

  @Roles('ADMIN', 'MODERATOR')
  @Post('admin')
  create(@Body() dto: CreateEbookDto) {
    return this.service.create(dto);
  }

  @Roles('ADMIN', 'MODERATOR')
  @Post('admin/upload/file')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadFile(@UploadedFile() file: { buffer?: Buffer; originalname?: string }) {
    return this.uploadService.saveUpload(file, 'file');
  }

  @Roles('ADMIN', 'MODERATOR')
  @Post('admin/upload/cover')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadCover(@UploadedFile() file: { buffer?: Buffer; originalname?: string }) {
    return this.uploadService.saveUpload(file, 'cover');
  }

  @Roles('ADMIN', 'MODERATOR')
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() dto: UpdateEbookDto) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN', 'MODERATOR')
  @Patch('admin/:id/publish')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Roles('ADMIN', 'MODERATOR')
  @Patch('admin/:id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.service.unpublish(id);
  }

  @Roles('ADMIN', 'MODERATOR')
  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Roles('ADMIN', 'USER', 'MODERATOR')
  @Post('purchase')
  purchase(
    @Req() req: AuthRequest,
    @Body() payload: { ebookId: string; paymentReference?: string },
  ) {
    return this.service.purchase(req.user.sub, payload);
  }

  @Roles('ADMIN', 'USER', 'MODERATOR')
  @Get(':id/access')
  access(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.access(req.user.sub, id);
  }

  @Roles('ADMIN', 'USER', 'MODERATOR')
  @Get(':id/progress')
  progress(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.getReadingProgress(req.user.sub, id);
  }

  @Roles('ADMIN', 'USER', 'MODERATOR')
  @Post(':id/progress')
  updateProgress(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() payload: ReadingProgressDto,
  ) {
    return this.service.updateReadingProgress(req.user.sub, id, payload);
  }

  @Roles('ADMIN', 'USER', 'MODERATOR')
  @Post(':id/download')
  recordDownload(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.recordDownload(req.user.sub, id);
  }

  @Roles('ADMIN', 'USER', 'MODERATOR')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}

