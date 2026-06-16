import { IsIn } from 'class-validator';
import { AnalyticsQueryDto } from './analytics-query.dto';

export class AnalyticsReportQueryDto extends AnalyticsQueryDto {
  @IsIn(['notifications', 'payments', 'subscriptions', 'users'])
  report!: 'notifications' | 'payments' | 'subscriptions' | 'users';
}
