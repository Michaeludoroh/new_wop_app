import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MentorshipAttendanceStatus } from '@prisma/client';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class MarkAttendanceDto {
  @IsEnum(MentorshipAttendanceStatus)
  status!: MentorshipAttendanceStatus;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(500)
  notes?: string;
}
