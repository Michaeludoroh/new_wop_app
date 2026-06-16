import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

type AuthRequest = {
  user: {
    sub: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
  };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('ADMIN')
  @Get()
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Roles('USER')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.usersService.findOne(id, req.user);
  }

  @Roles('USER')
  @Patch(':id/profile')
  updateProfile(
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
    @Req() req: AuthRequest,
  ) {
    return this.usersService.updateProfile(id, payload, req.user);
  }

  @Roles('ADMIN')
  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: AuthRequest,
  ) {
    return this.usersService.updateRole(id, dto.role, req.user);
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: AuthRequest,
  ) {
    return this.usersService.updateStatus(id, dto.active, req.user);
  }
}
