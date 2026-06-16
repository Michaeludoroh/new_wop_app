import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePolicyDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  })
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  })
  @IsString()
  content?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveDate?: Date | null;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
