import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateEbookDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(160)
  author?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @Transform(({ value }) => trimString(value))
  @IsUrl({ require_tld: false })
  fileUrl!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsUrl({ require_tld: false })
  coverUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
