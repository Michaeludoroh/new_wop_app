import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UserQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED', 'ALL'])
  status?: 'ACTIVE' | 'DISABLED' | 'ALL';

  @IsOptional()
  @IsIn(['VERIFIED', 'UNVERIFIED', 'ALL'])
  emailVerification?: 'VERIFIED' | 'UNVERIFIED' | 'ALL';

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 50 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 0 : Number(value)))
  @IsInt()
  @Min(0)
  offset = 0;
}
