import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class ReadingProgressDto {
  @IsInt()
  @Min(1)
  currentPage!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalPages?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPct?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  bookmarkPages?: number[];

  @IsOptional()
  @IsBoolean()
  downloaded?: boolean;
}
