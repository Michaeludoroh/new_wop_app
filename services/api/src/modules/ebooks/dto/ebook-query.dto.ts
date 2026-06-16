import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class EbookQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  category?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  recent?: boolean;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
