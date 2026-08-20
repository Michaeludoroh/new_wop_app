import { PaymentProvider } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class PaymentWebhookDto {
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @IsString()
  @IsNotEmpty()
  eventType!: string;

  @IsString()
  @IsNotEmpty()
  signature!: string;

  @IsOptional()
  @IsString()
  providerReference?: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
