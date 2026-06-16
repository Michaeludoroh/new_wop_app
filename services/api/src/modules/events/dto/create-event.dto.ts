import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { EventLocationType } from '@prisma/client';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateEventDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(220)
  slug?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsUrl({ require_tld: false })
  bannerImageUrl?: string;

  @IsEnum(EventLocationType)
  locationType!: EventLocationType;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(240)
  venue?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsUrl({ require_tld: false })
  meetingLink?: string;

  @IsDateString()
  startDateTime!: string;

  @IsDateString()
  endDateTime!: string;

  @IsOptional()
  @IsBoolean()
  registrationRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
