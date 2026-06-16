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
import { CreateMentorshipDto } from './dto/create-mentorship.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { MentorshipQueryDto } from './dto/mentorship-query.dto';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { UpdateMentorshipDto } from './dto/update-mentorship.dto';
import { UpdateMentorshipProgressDto } from './dto/update-mentorship-progress.dto';
import { MentorshipService } from './mentorship.service';

type AuthRequest = Request & {
  user: {
    sub: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  };
};

@Controller('mentorship')
export class MentorshipController {
  constructor(private readonly service: MentorshipService) {}

  @Get('public')
  listPublic(@Query() query: MentorshipQueryDto) {
    return this.service.listPublic(query);
  }

  @Get('public/featured')
  listFeatured(@Query() query: MentorshipQueryDto) {
    return this.service.listFeatured(query);
  }

  @Get('public/mentors')
  listMentors(@Query() query: MentorshipQueryDto) {
    return this.service.listMentors(query);
  }

  @Get('public/:slugOrId/sessions')
  listPublicSessions(@Param('slugOrId') slugOrId: string) {
    return this.service.listPublicSessions(slugOrId);
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
  listAdmin(@Query() query: MentorshipQueryDto) {
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
  @Get('admin/:id/participants')
  listParticipants(@Param('id') id: string) {
    return this.service.listParticipants(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/:id/sessions')
  listSessions(@Param('id') id: string) {
    return this.service.listSessions(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/:id/feedback')
  listFeedback(@Param('id') id: string) {
    return this.service.listFeedback(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/:id/progress')
  listClassProgress(@Param('id') id: string) {
    return this.service.listClassProgress(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Post('admin')
  create(@Body() dto: CreateMentorshipDto, @Req() req: AuthRequest) {
    return this.service.create(dto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Patch('admin/:id')
  update(@Param('id') id: string, @Body() dto: UpdateMentorshipDto) {
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
  @Roles('MODERATOR')
  @Post('admin/:id/sessions')
  createSession(@Param('id') id: string, @Body() dto: CreateSessionDto) {
    return this.service.createSession(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Patch('admin/sessions/:sessionId')
  updateSession(@Param('sessionId') sessionId: string, @Body() dto: UpdateSessionDto) {
    return this.service.updateSession(sessionId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Delete('admin/sessions/:sessionId')
  removeSession(@Param('sessionId') sessionId: string) {
    return this.service.removeSession(sessionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Get('admin/sessions/:sessionId/attendance')
  listSessionAttendance(@Param('sessionId') sessionId: string) {
    return this.service.listSessionAttendance(sessionId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR')
  @Patch('admin/sessions/:sessionId/attendance/:userId')
  markAttendance(
    @Param('sessionId') sessionId: string,
    @Param('userId') userId: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.service.markAttendance(sessionId, userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Get('me/enrollments')
  listMyEnrollments(@Req() req: AuthRequest) {
    return this.service.listMyEnrollments(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Get('me/:id/attendance')
  getMyAttendance(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.getMyAttendance(id, req.user.sub);
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
    @Body() dto: UpdateMentorshipProgressDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.updateMyProgress(id, req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @Post('me/:id/feedback')
  submitFeedback(
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.submitFeedback(id, req.user.sub, dto);
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
