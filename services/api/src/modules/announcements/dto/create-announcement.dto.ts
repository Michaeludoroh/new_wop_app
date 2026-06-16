import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ANNOUNCEMENT_CATEGORIES } from './announcement-category.constants';

export class CreateAnnouncementDto {
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  })
  @IsString()
  @MaxLength(160)
  title!: string;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value.trim();
  })
  @IsString()
  content!: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(1024)
  imageUrl?: string;

  @IsOptional()
  @IsIn(ANNOUNCEMENT_CATEGORIES)
  category?: (typeof ANNOUNCEMENT_CATEGORIES)[number];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
