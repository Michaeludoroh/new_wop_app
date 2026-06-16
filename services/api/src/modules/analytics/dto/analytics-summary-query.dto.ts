import { IsIn, IsOptional } from 'class-validator';
import { AnalyticsQueryDto } from './analytics-query.dto';

export class AnalyticsSummaryQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsIn(['overview', 'engagement', 'notifications', 'payments', 'subscriptions', 'operational'])
  section?:
    | 'overview'
    | 'engagement'
    | 'notifications'
    | 'payments'
    | 'subscriptions'
    | 'operational';
}
