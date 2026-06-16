import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
