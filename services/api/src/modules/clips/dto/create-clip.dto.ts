import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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

export class CreateClipDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Transform(({ value }) => trimString(value))
  @IsUrl({ require_tld: false })
  videoUrl!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(160)
  speaker?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scriptureReferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
