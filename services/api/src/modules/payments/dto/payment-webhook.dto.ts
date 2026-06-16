import { PaymentProvider } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

const PaymentProviderValues = ['FLUTTERWAVE'] as const;
type PaymentProviderValue = (typeof PaymentProviderValues)[number];

export class PaymentWebhookDto {
  @IsEnum(PaymentProviderValues)
  provider!: PaymentProviderValue;

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
