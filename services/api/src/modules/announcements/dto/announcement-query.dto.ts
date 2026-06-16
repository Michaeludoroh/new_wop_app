import { ContentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ANNOUNCEMENT_CATEGORIES } from './announcement-category.constants';

export class AnnouncementQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 1 : Number(value)))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 20 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(ANNOUNCEMENT_CATEGORIES)
  category?: (typeof ANNOUNCEMENT_CATEGORIES)[number];

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}
