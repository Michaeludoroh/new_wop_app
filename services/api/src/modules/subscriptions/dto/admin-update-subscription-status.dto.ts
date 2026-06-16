import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class AdminUpdateSubscriptionStatusDto {
  @IsEnum(SubscriptionStatus)
  status!: SubscriptionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
