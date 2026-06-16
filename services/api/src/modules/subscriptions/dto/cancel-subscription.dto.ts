import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CancelSubscriptionDto {
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
