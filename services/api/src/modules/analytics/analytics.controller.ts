import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsReportQueryDto } from './dto/analytics-report-query.dto';
import { AnalyticsSummaryQueryDto } from './dto/analytics-summary-query.dto';
import { AnalyticsService } from './analytics.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('summary')
  summary(@Query() query: AnalyticsSummaryQueryDto) {
    return this.service.getSummary(query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('report')
  report(@Query() query: AnalyticsReportQueryDto) {
    return this.service.getReport(query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('operational')
  operational(@Query() query: AnalyticsSummaryQueryDto) {
    return this.service.getOperationalSummary(query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('dashboard')
  dashboard(@Query() query: AnalyticsQueryDto) {
    return this.service.getDashboard(query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('growth')
  growth(@Query() query: AnalyticsQueryDto) {
    return this.service.getGrowth(query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('activity')
  activity(@Query() query: AnalyticsQueryDto) {
    return this.service.getActivity(query);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('top-content')
  topContent(@Query() query: AnalyticsQueryDto) {
    return this.service.getTopContent(query);
  }
}
