import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateSessionDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsUrl({ require_tld: false })
  meetingLink?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(240)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSessionDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsUrl({ require_tld: false })
  meetingLink?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(240)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
