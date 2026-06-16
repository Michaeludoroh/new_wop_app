import { PaymentStatus } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

export class PaymentHistoryQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  status?: PaymentStatus;
}
