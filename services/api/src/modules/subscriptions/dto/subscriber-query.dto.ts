import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class SubscriberQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  status?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  planCode?: string;

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
