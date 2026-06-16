import { PolicyType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { POLICY_TYPES } from './policy-type.constants';

export class CreatePolicyDto {
  @IsIn(POLICY_TYPES)
  type!: PolicyType;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  })
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(160)
  slug?: string;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  })
  @IsString()
  content!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveDate?: Date;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}
