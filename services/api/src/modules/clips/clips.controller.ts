import { Controller, Get, Post, Body, Param, UseGuards, Query, Patch, Delete, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClipQueryDto } from './dto/clip-query.dto';
import { CreateClipDto } from './dto/create-clip.dto';
import { UpdateClipDto } from './dto/update-clip.dto';
import { ClipsService } from './clips.service';
import { ClipsUploadService } from './clips-upload.service';

@Controller('clips')
export class ClipsController {
  constructor(
    private readonly service: ClipsService,
    private readonly uploadService: ClipsUploadService,
  ) {}

  @Get('public')
  listPublic(@Query() query: ClipQueryDto) {
    return this.service.listPublic(query);
  }

  @Get('public/featured')
  listFeatured(@Query() query: ClipQueryDto) {
    return this.service.listFeatured(query);
  }

  @Get('public/:id')
  findPublicById(@Param('id') id: string) {
    return this.service.findPublicById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin')
  listAdmin(@Query() query: ClipQueryDto) {
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
  @Post('admin')
  create(@Body() dto: CreateClipDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() dto: UpdateClipDto) {
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
  @Post('admin/upload/media')
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(@UploadedFile() file: { buffer?: Buffer; originalname?: string }) {
    return this.uploadService.saveUpload(file, 'media');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Post('admin/upload/thumbnail')
  @UseInterceptors(FileInterceptor('file'))
  uploadThumbnail(@UploadedFile() file: { buffer?: Buffer; originalname?: string }) {
    return this.uploadService.saveUpload(file, 'thumbnail');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
