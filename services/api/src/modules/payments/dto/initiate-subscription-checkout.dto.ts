import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitiateSubscriptionCheckoutDto {
  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
