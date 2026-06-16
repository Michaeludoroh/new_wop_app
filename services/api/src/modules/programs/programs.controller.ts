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
import { CreateProgramDto } from './dto/create-program.dto';
import { ProgramQueryDto } from './dto/program-query.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { UpdateProgramProgressDto } from './dto/update-program-progress.dto';
import { ProgramsService } from './programs.service';

type AuthRequest = Request & {
  user: {
    sub: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  };
};

@Controller('programs')
export class ProgramsController {
  constructor(private readonly service: ProgramsService) {}

  @Get('public')
  listPublic(@Query() query: ProgramQueryDto) {
    return this.service.listPublic(query);
  }

  @Get('public/featured')
  listFeatured(@Query() query: ProgramQueryDto) {
    return this.service.listFeatured(query);
  }

  @Get('public/:slugOrId')
  findPublicBySlugOrId(@Param('slugOrId') slugOrId: string) {
    return this.service.findPublicBySlugOrId(slugOrId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/analytics')
  adminAnalytics() {
    return this.service.adminAnalytics();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin')
  listAdmin(@Query() query: ProgramQueryDto) {
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
  @Get('admin/:id/enrollments')
  listEnrollments(@Param('id') id: string) {
    return this.service.listEnrollments(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/:id/progress')
  listProgramProgress(@Param('id') id: string) {
    return this.service.listProgramProgress(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Post('admin')
  create(@Body() dto: CreateProgramDto, @Req() req: AuthRequest) {
    return this.service.create(dto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProgramDto) {
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Get('me/enrollments')
  listMyEnrollments(@Req() req: AuthRequest) {
    return this.service.listMyEnrollments(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Get('me/:id/progress')
  getMyProgress(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.getMyProgress(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Patch('me/:id/progress')
  updateMyProgress(
    @Param('id') id: string,
    @Body() dto: UpdateProgramProgressDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.updateMyProgress(id, req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Post(':id/enroll')
  enroll(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.enroll(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Delete(':id/enroll')
  cancelEnrollment(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.cancelEnrollment(id, req.user.sub);
  }
}
