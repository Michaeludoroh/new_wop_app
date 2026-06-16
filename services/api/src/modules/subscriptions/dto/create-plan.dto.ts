const BillingIntervalValues = ['MONTHLY', 'QUARTERLY', 'YEARLY'] as const;
type BillingIntervalValue = (typeof BillingIntervalValues)[number];
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsEnum(BillingIntervalValues)
  billingInterval!: BillingIntervalValue;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  trialPeriodDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  recurringEnabled?: boolean;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
